// Copyright Jason Savard

function MailAccount() {

    const REQUEST_TIMEOUT = 10000;

	this.unreadCount = -1;
	this.lastGetEmailsDate = new Date(1);
	this.lastSuccessfulMailUpdate = new Date(1);
	
	var historyId;
	var mailArray = [];
	var newestMailArray = [];
	var unSnoozedEmails = [];
	var emailsInAllLabels = [];
    
    var mailAddress;
    var accountAddingMethod;
    var useBasicHTMLView;
    var conversationView;
    var showEOM;
    var hideSentFrom;

	var syncSignInIdTimer;
	var lastGmailATFetch = new Date(1);
	var gmailAT;
	var getGmailAtPromise;
	var gmailATProcessing = false;
	var cachedInboxFeedRequest;
	var enablePushNotificationsRetries = 0;
	var watchRetries = 0;
	var labels = null;

	// Without this/that, no internal calls to onUpdate or onError can be made...
    var that = this;

    this.init = async params => {
        that.id = params.accountNumber;
        mailAddress = params.mailAddress;

        // use this section to "cache" storage variables so I wouldn't have to convert all calls to async
        accountAddingMethod = await storage.get("accountAddingMethod");
        useBasicHTMLView = await storage.get("useBasicHTMLView");
        showEOM = await storage.get("showEOM");
        hideSentFrom = await storage.get("hideSentFrom");

        // account specific
        conversationView = await that.getSetting("conversationView");;
    }
    
    this.getAccountAddingMethod = function() {
        return accountAddingMethod;
    }
	
	this.test = function() {
		console.log(mailArray);
		mailArray.push(mailArray.first());
		mailArray.last().id = "123";
	}
	
   	function filterEmailBody(subject, body) {
	   if (body) {
		   
		   // remove line breaks because regex cannot match content before lines especially with start of line operator ^
		   body = body.replace(/\r\n/g, " ");
		   body = body.replace(/^facebook([a-z])/i, "$1"); // $1 is a regex variable indicating matching everything, remove facebook string because when doing htmlToText ... we get a string like: facebookWilliam da Silva commented on your status.William wrote:
		   
		   var regexs = new Array();
		   
		   regexs.push(/ on [a-z]{3}, [a-z]{3} \d+/i);	// On Wed, Dec 28, 2011 at 12:36 AM, Jason <jaso
		   regexs.push(/ on [a-z]{3} \d+\/\d+\/\d+/i);	// On Wed 15/02/12  8:23 AM , Wade Konowalchuk
		   regexs.push(/ on \d+[\/|-]\d+[\/|-]\d+/i);	// on 2011/12/28 Jason <apps@...
		   regexs.push(/ on \w*, \w* \d+(st)?, \d+,/i);	// On Thursday, October 31, 2013, Jason wrote:   OR   On Wednesday, October 15, 2014, Jason <jasonsavard@gmail.com> wrote:
		   regexs.push(/ >? on \w* \d+, \d+, at/i);	// In!  > On Oct 5, 2014, at 9:32 AM ...
		   regexs.push(/ (on)? ([a-z]{3} )?[a-z]{3} \d+,? \d+ /i); 		// On(optional) Fri(optional) May 04 2012 15:54:46
		   regexs.push(/ (on)? ([a-z]{3} )?\d+,? [a-z]{3}/i); 		// On(optional) Fri(optional) 28 April 2015 at??? 13:17
		   //regexs.push(/ \d+[\/|-]\d+[\/|-]\d+/i);		// 2011/12/28 Jason <apps@...
		   regexs.push(/ [\-]+ original message/i); // -------- Message original -------- 
		   regexs.push(/ [\-]+ message original/i); // -------- original Message -------- 
		   regexs.push(/ ?sent from: /i);
		   regexs.push(/ ?get outlook for ios/i);
		   regexs.push(/ ?get outlook for android/i);
		   regexs.push(/ ?Envoyé de mon i/);
		   regexs.push(/ ?cc: /i);
		   regexs.push(/ date: /i); // removed the '?' because the word up'date' would stop the filter
		   regexs.push(/ ?from: /i); //great From: Jason
		   regexs.push(/ ?Reply to this email to comment on this status./i); // facebook ending
		   regexs.push(/ subject: re: /i); // facebook ending
		   // DONT use because passing subject string with unintential regex syntax screwed it up like ] and [ etc.
		   //regexs.push( new RegExp(" subject: re: " + subject, "i") );	// I can play afterall, any room left ? Subject: Re: Saturday's game Nov 2nd at 2pm From: wade@
		   
		   if (hideSentFrom) {
			   //regexs.push(/^(.*) ?sent from \w* ?\w* ?$/i); // "Sent from Blackberry" or "Sent from my iPhone"
			   regexs.push(/ ?Sent (wirelessly )?from my /i); // "Sent from my Blackberry" or "Sent from my iPhone"
			   regexs.push(/ ?Sent on the ?\w* \w* network/i); // "Sent on the TELUS Mobility network with BlackBerry"
			   regexs.push(/ ?Sent from \w* mobile/i); // "Sent from Samsung Mobile"
			   regexs.push(/ ?Sent from Windows Mail/i); // "Sent from Samsung Mobile"
		   }
		   
		   for (var a=0; a<regexs.length; a++) {			   
			   /*
			   // max this internal loop to 10: just in case it goes on forever
			   // by the way we re-passing the same regex several times until all occurences of ie from" are gone... "Hello1 from: Hello2 from:"
			   for (var b=0; b<10; b++) {
				   var matches = body.match(regexs[a]);
				   if (matches && matches.length >= 2) {
					   body = matches[1];
				   } else {
					   break;
				   }
			   }
			   */
			   
			   // regex.search = faster ...
			   var searchIndex = body.search(regexs[a]);
			   if (searchIndex != -1) {
				   body = body.substring(0, searchIndex);
			   }
		   }
		   
		   body = $.trim(body);
		   
		   // remove repeated subject line from beginning of the body (ie. emails from facebook tend to do that etc. like William da Silva commented on your status.
		   if (body.indexOf(subject) == 0 && subject && subject.length >= 20) {
			   body = body.substring(subject.length);
		   }
		   
	   } else {
		   body = "";
	   }
	   return body;
   	}

   	function getFeedUnreadCount(params, parsedFeed) {
   		return new Promise((resolve, reject) => {
   			
   		   var feedUnreadCount = Number(parsedFeed.find('fullcount').text());

 		   // TESTING
 		   //alert('remove test')
 		   //feedUnreadCount = 0;
 		   if (feedUnreadCount) {
 			   resolve(feedUnreadCount);
 		   } else {							   
 			   // patch: because fullcount is 'sometimes' 0 for some user accounts for labels: important or allmail (https://github.com/aceat64/MailCheckerMinus/issues/15 or banko.adam@gmail.com)
 			   feedUnreadCount = Number(parsedFeed.find('entry').length);
 			   
 			   // TESTING
 			   // 20 is the limit to the feed so there might be more unread emails, let's use the basic view to fetch the real total (we can only do this for allmail/unread label because even the basic view only says 1-20 of "about"??? blahblah
 			   if (feedUnreadCount >= MAX_EMAILS_IN_ATOM_FEED && params.monitorLabels[params.monitorLabelsIndex] == SYSTEM_ALL_MAIL) {
 				   console.log("use the basic view to fetch the real total...")
 				   
 				   ajaxBasicHTMLGmail({
 					   type: "GET",
 					   timeout: REQUEST_TIMEOUT,
 					   url: that.getMailUrl({useBasicGmailUrl:true}) + "?s=q&q=label%3Aunread" // append 'unread' to only fetch unreads of this label of course
 				   }).then(data => {
					   // patch: must place wrapper div element because jQuery would generate error when trying to parse the response into the $() contructor ... Uncaught Error: Syntax error, unrecognized expression: <html...
					   var $responseText = parseHtmlToJQuery(data);
					   var realTotal = $responseText.find("table tr:first-child td b:nth-child(3)").first().text();
					   if (realTotal && $.isNumeric(realTotal) && realTotal != "0") {
						   feedUnreadCount = Number(realTotal);
					   } else {
						   realTotal = $responseText.find("table tr:first-child td b:nth-child(2)").first().text();
						   if (realTotal && $.isNumeric(realTotal) && realTotal != "0") {
							   feedUnreadCount = Number(realTotal);
						   }
					   }
					   resolve(feedUnreadCount);
 				   }).catch(error => {
 					   console.error("error passing gmail basic question: " + error);
 					   resolve(feedUnreadCount);
 				   });
 			   } else {
 				   resolve(feedUnreadCount);
 			   }
 		   	}
   		});
   	}
   	
   function addParsedFeed(params, parsedFeed, feedUnreadCount) {
	   // add the parsed feeds and continue for more						   
	   var feedInfo = {label:params.monitorLabels[params.monitorLabelsIndex], parsedFeed:parsedFeed, feedUnreadCount:feedUnreadCount};
	   
	   params.feedsArrayInfo.push(feedInfo);
	   params.monitorLabelsIndex++;
   }
   
   function initErrors(account, jqXHR, error, errorCode) {
	   account.error = error;
	   if (errorCode) {
		   account.errorCode = errorCode;
	   }
	   
	   var error = new Error(error);
	   error.errorCode = errorCode;
	   error.jqXHR = jqXHR;
	   return error;
   }
   
   function fetchFeed(params) {
	   return new Promise((resolve, reject) => {
		   
		   var LABEL_TO_ENSURE_MAIL_ADDRESS_IS_IDENTIFIED = SYSTEM_INBOX;
		   
		   var label;
		   if (params.ensureMailAddressIdentifiedFlag) {
			   label = LABEL_TO_ENSURE_MAIL_ADDRESS_IS_IDENTIFIED;
		   } else {
			   if (params.label) {
				   label = params.label;
			   } else {
				   label = params.monitorLabels[params.monitorLabelsIndex];
			   }
		   }
		   
		   var atomFeed;
		   if (label) {
			   if (label == SYSTEM_INBOX) {
				   atomFeed = AtomFeed.INBOX;
			   } else if (label == SYSTEM_IMPORTANT) {
				   atomFeed = AtomFeed.IMPORTANT;
			   } else if (label == SYSTEM_IMPORTANT_IN_INBOX) {
				   atomFeed = AtomFeed.IMPORTANT_IN_INBOX;
			   } else if (label == SYSTEM_ALL_MAIL) {
				   atomFeed = AtomFeed.UNREAD;
			   } else if (label == SYSTEM_PRIMARY) {
				   atomFeed = AtomFeed.PRIMARY;
			   } else if (label == SYSTEM_PURCHASES) {
				   atomFeed = AtomFeed.PURCHASES;
			   } else if (label == SYSTEM_FINANCE) {
				   atomFeed = AtomFeed.FINANCE;
			   } else if (label == SYSTEM_SOCIAL) {
				   atomFeed = AtomFeed.SOCIAL;
			   } else if (label == SYSTEM_PROMOTIONS) {
				   atomFeed = AtomFeed.PROMOTIONS;
			   } else if (label == SYSTEM_UPDATES) {
				   atomFeed = AtomFeed.UPDATES;
			   } else if (label == SYSTEM_FORUMS) {
				   atomFeed = AtomFeed.FORUMS;
			   } else {
				   atomFeed = label;
			   }
			   
			   // apparently iPads add these labels with slashes (ie. INBOX/ they are not actually nested labels just labels with slashes in them)
			   atomFeed = atomFeed.replace(/\//g, "-"); // slashes must had to replaced with - to work (yeah that's gmail wants it)
			   atomFeed = encodeURIComponent(atomFeed);
		   } else {
			   atomFeed = AtomFeed.INBOX;
		   }

		   var url = that.getMailUrl({useStandardGmailUrl:true, atomFeed:atomFeed, urlParams:"timestamp=" + Date.now()});
		   
		   // now only using cache for ensuremaiaddress because there were duplicate mail issues https://jasonsavard.com/forum/discussion/comment/16273#Comment_16273
		   var useCache = params.ensureMailAddressIdentifiedFlag && cachedInboxFeedRequest;
		   var jqxhr;
		   if (useCache) {
			   jqxhr = cachedInboxFeedRequest;
		   } else {
			   jqxhr = $.ajax({
				   type: "GET",
				   dataType: "text",
				   url: url,
				   timeout: REQUEST_TIMEOUT,
				   xhr: function() {
					   var xhr = new window.XMLHttpRequest();
					   xhr.onreadystatechange = function(data) {
						   if (xhr.readyState == 4) {
							   // save responseURL onto jqxhr object 
							   jqxhr.responseURL = xhr.responseURL;
						   }
					   };
				       return xhr;
				   }
			   });
			   if (params.ensureMailAddressIdentifiedFlag) {
				   cachedInboxFeedRequest = jqxhr;
			   }
		   }
		   
		   jqxhr.done((data, textStatus, jqXHR) => {
			   that.error = null;
			   
			   var parser = new DOMParser();
			   parsedFeed = $(parser.parseFromString(jqXHR.responseText, "text/xml"));
			   
			   // detect Google account without Gmail (is usually redirected to an add gmail account page (ie. AddMailService)
			   if (/AddMailService/i.test(jqXHR.responseURL)) {
				   // find the email address in response
				   if (jqXHR.responseText) {
					   var emailMatches = extractEmails(jqXHR.responseText);
					   if (emailMatches) {
						   emailMatches.some(function(emailMatch) {
							   // make sure is it NOT @gmail
							   if (emailMatch.indexOf("@gmail.com") == -1) {
								   mailAddress = emailMatch;
								   return true;
							   }
						   });
					   }
				   }
				   
				   if (!mailAddress) {
					   mailAddress = MAIL_ADDRESS_UNKNOWN;
				   }
				   reject(initErrors(that, jqXHR, "Error: Google account without Gmail", JError.GOOGLE_ACCOUNT_WITHOUT_GMAIL));
			   } else if (/ServiceNotAllowed/i.test(jqXHR.responseURL)) {
				   // ie. https://accounts.google.com/ServiceLogin?continue=https://admin.google.com/blah.com/ServiceNotAllowed?service=mail&service=CPanel&skipvpage=true&authuser=1
				   var matches = jqXHR.responseURL.match(/continue=(.*)admin.google.com\/(.*)\//);
				   if (matches && matches.length >= 3) {
					   mailAddress = matches[2];
				   }
				   if (!mailAddress) {
					   mailAddress = MAIL_ADDRESS_UNKNOWN;
				   }
				   reject(initErrors(that, jqXHR, "Gmail is not enabled", JError.GMAIL_NOT_ENABLED));
			   } else if (/DomainRestrictedNetwork/i.test(jqXHR.responseURL)) {
				   // ie. https://accounts.google.com/b/0/DomainRestrictedNetwork?service=mail&continue=https://mail.google.com/mail/
				   mailAddress = MAIL_ADDRESS_UNKNOWN;
				   reject(initErrors(that, jqXHR, "Gmail is not enabled", JError.GMAIL_NOT_ENABLED));
			   } else if (/CookieMismatch/i.test(jqXHR.responseURL)) {
				   mailAddress = MAIL_ADDRESS_UNKNOWN;
				   reject(initErrors(that, jqXHR, "Problem with your cookie settings", JError.COOKIE_PROBLEMS));
			   } else if (/NewServiceAccount/i.test(jqXHR.responseURL)) {
				   // ie. https://accounts.google.com/b/0/NewServiceAccount?service=mail&continue=https://mail.google.com/mail/
				   mailAddress = MAIL_ADDRESS_UNKNOWN;
				   reject(initErrors(that, jqXHR, "Service account?", JError.GOOGLE_SERVICE_ACCOUNT));
			   } else {
				   if (jqXHR.responseURL && jqXHR.responseURL.indexOf("mail.google.com/mail/u/") == -1) {
					   logError("unrecognized responseURL: " + jqXHR.responseURL);
				   }
				   
				   var titleNode = parsedFeed.find('title');
				   if (titleNode.length >= 1) {			   
					   var titleNodeStr = $(titleNode[0]).text();
					   let mailTitle = titleNodeStr.replace("Gmail - ", "");
					   
					   // patch because <title> tag could contain a label with a '@' that is not an email address ie. Gmail - Label '@test@' for blah@gmail.com
					   var emails = mailTitle.match(/([\S]+@[\S]+)/ig);
					   if (emails) {
						   mailAddress = emails.last();
					   } else {
						   // catch these errors:
						   // Access to this site is blocked
						   // Acceso Denegado
						   // Denied Access Policy
						   
						   mailAddress = MAIL_ADDRESS_UNKNOWN;
						   
						   var logErrorStr = "title node error: ";
						   var error;
						   if (/Google Accounts|My Account/.test(titleNodeStr)) {
							   logErrorStr += titleNodeStr + " responseurl: " + jqXHR.responseURL; // + " ... " + parsedFeed.text().substr(1000);
							   error = "Error: " + "redirection";
						   } else {
							   logErrorStr += titleNodeStr + " responseurl2: " + jqXHR.responseURL;
							   error = "Error: " + titleNodeStr;
						   }

						   reject(initErrors(that, jqXHR, error));
						   logError(logErrorStr);
						   return;
					   }
					   
					   that.link = parsedFeed.find('link').attr('href');
				   } else {
					   mailAddress = "Cookie problem, try signing out and in or restart browser!";
				   }
				   
				   params.parsedFeed = parsedFeed;
				   resolve(params);
			   }
		   }).fail((jqXHR, textStatus, errorThrown) => {
			   // jqXHR.status = 401 = unauthorized, 0=timeout
			   // jqXHR.statusText = unauthorized, timeout
			   // textStatus (param) "success", "notmodified", "error", "timeout", "abort", or "parsererror"
			   var error = jqXHR.statusText;
			   console.warn("fetchFeed error: " + error);
			   reject(initErrors(that, jqXHR, error));
		   }).always(() => {
			   if (useCache) {
				   cachedInboxFeedRequest = null;
			   }
		   });
	   });
   }
   
   function fetchEmailsByLabel(params) {
	   // finished with feeds so exit/callback
	   if (params.monitorLabelsIndex >= params.monitorLabels.length) {
		   return Promise.resolve(params);
	   } else {
		   return fetchFeed(params).then(async fetchFeedResponse => {
               const accountMonitorLabels = await that.getMonitorLabels();
			   var parsedFeed = fetchFeedResponse.parsedFeed;
			   
			   // If previousMonitorLabel not matching current then we are probably fetching this feed for the first time and so now we have the email address, we must now check if the user selected a different label to monitor for this email address, if so stop this one and call the feed again
			   if (params.monitorLabels.toString() != accountMonitorLabels.toString()) {
				   // this is a safety flag so that they we don't endless recursively call getEmails()
				   if (params.fetchFeedAgainSinceMonitorLabelIsDifferent) {
					   that.error = "JError: recursive error with label";
					   var errorObj = new Error(that.error);
					   errorObj.jqXHR = fetchFeedResponse.jqXHR;
					   return Promise.reject(errorObj);
				   } else {					   
					   // update monitor labels and send it again
					   console.log("call again since fetchFeedAgainSinceMonitorLabelIsDifferent");
					   params.monitorLabels = accountMonitorLabels;
					   params.fetchFeedAgainSinceMonitorLabelIsDifferent = true;
					   return fetchEmailsByLabel(params);
				   }
			   } else {
				   return getFeedUnreadCount(params, parsedFeed).then(feedUnreadCount => {
					   return addParsedFeed(params, parsedFeed, feedUnreadCount);
				   }).then(() => {
					   return fetchEmailsByLabel(params);
				   }).catch(error => {
					   return Promise.reject(error);
				   });
			   }
		   });
	   }
   }

   function ensureUnreadAndInbox(feed1, feed2) {
	   console.log("ensureUnreadAndInbox");
	   return new Promise((resolve, reject) => {
		   
		   // Monitoring the Primary/inbox is usually not enough because some users will mark as done/archive emails without marking them as read and thus these "primary"/inbox labelled emails will still show up even though they don't appear in the user's ui
		   // .. so we must also check that the "inbox" to prove they did not mark as done these emails
		   if (feed1 && feed1.feedUnreadCount) {
			   
			   // get previously fetched inbox feed OR get new fetch
			   new Promise((resolve, reject) => {
				   if (feed2) {
					   resolve(feed2);
				   } else {
					   console.log("must fetch primary/inbox feed")
					   var feed2Label;
					   if (feed1.label == SYSTEM_INBOX) {
						   feed2Label = SYSTEM_PRIMARY;
					   } else if (isMainCategory(feed1.label)) {
						   feed2Label = SYSTEM_INBOX;
					   }
					   fetchFeed({label:feed2Label}).then(fetchFeedResponse => {
						   feed2 = fetchFeedResponse;
						   resolve(fetchFeedResponse);
					   }).catch(error => {
						   reject(error);
					   });
				   }
			   }).then(feed2Response => {
				   console.log("otherFeed", feed2Response);
				   var feed2UnreadCount = Number(feed2Response.parsedFeed.find('entry').length);
				   
				   var lastFeed1Entry = feed1.parsedFeed.find("entry").last();
				   var lastFeed1EntryIssued = Date.parse(lastFeed1Entry.find('issued').text());
				   
				   var lastFeed2Entry = feed2Response.parsedFeed.find("entry").last();
				   var lastFeed2EntryIssued;
				   if (lastFeed2Entry.length) {
					   lastFeed2EntryIssued = Date.parse(lastFeed2Entry.find('issued').text());
				   }
				   
				   console.log("last feed dates", lastFeed1EntryIssued, lastFeed2EntryIssued);
				   
				   // if less than the maximum 20 OR last entry is after last entry of other feed, than we can use this feed to gaurantee we can remove emails from the primary/inbox fetch if they are also not found in this primary/inbox feed
				   // OR if oldest primary/inbox email is within time range of all emails in inbox feed
				   if (feed2UnreadCount < MAX_EMAILS_IN_ATOM_FEED || lastFeed1EntryIssued.isAfter(lastFeed2EntryIssued)) {
					   // transport jquery array to array for speed optimization
					   var feed2Array = [];
					   
					   feed2Response.parsedFeed.find('entry').each(function () {
						   var $entry = $(this);
						   var issued = Date.parse($entry.find('issued').text());
						   var id = getMessageIdFromAtomFeedEntry($entry);
						   feed2Array.push({id:id, issued:issued});
					   });

					   // now let's remove all primary/inbox emails which do not have an inbox/primary label
					   for (var a=0; a<emailsInAllLabels.length; a++) {
						   if (emailsInAllLabels[a].monitoredLabel == feed1.label) {
							   var foundFeed2Label = false;
							   for (var b=0; b<feed2Array.length; b++) {
								   if (emailsInAllLabels[a].id == feed2Array[b].id) {
									   foundFeed2Label = true;
									   break;
								   }
							   }
							   
							   if (foundFeed2Label) {
								   that.unreadCount++;
							   } else {
								   console.log("remove email because did not pass primaryANDinbox test", emailsInAllLabels[a].title);
								   
								   var mailIdNotFoundInBothPrimaryAndInbox = emailsInAllLabels[a].id;
								   
								   emailsInAllLabels.splice(a, 1);
								   a--;
								   //that.unreadCount--;
								   
								   // remove it from newestmailarray also
								   newestMailArray.some(function(newestMail, index) {
									   if (mailIdNotFoundInBothPrimaryAndInbox == newestMail.id) {
										   newestMailArray.splice(index, 1);
										   return true;
									   }
								   });
							   }
						   }
					   }
					   
					   resolve();
				   } else {
					   // since more than 20 (or more) emails than some might have been excluded - so we cannot use this inbox fetch
					   reject(JError.CANNOT_ENSURE_MAIN_AND_INBOX_UNREAD);
				   }
			   }).catch(function(error) {
				   reject(error);
			   });
			   
		   } else {
			   resolve();
		   }
	   });
   }

   function ensureUnreadAndInboxForMultipleFeeds(feeds, inboxFeed) {
        // must do it sequentially because we don't want to poll for inbox several times
        var allPromises = feeds.reduce((sequence, feed) => {
            return sequence.then(() => {
                // fetch next feed
                return ensureUnreadAndInbox(feed, inboxFeed);
            });
        }, Promise.resolve());

        return allPromises;
   }
   
   this.getHistoryId = function() {
	   return historyId;
   }
   
   this.getLabelName = function(labelId) {
	   var labelName;
	   
	   if (accountAddingMethod == "autoDetect") {
		   labelName = labelId;
	   } else {
		   if (labelId == SYSTEM_PRIMARY) {
			   labelName = getMessage("primary");
		   } else if (labelId == SYSTEM_PURCHASES) {
			   labelName = getMessage("purchases");
		   } else if (labelId == SYSTEM_FINANCE) {
			   labelName = getMessage("finance");
		   } else if (labelId == SYSTEM_SOCIAL) {
			   labelName = getMessage("social");
		   } else if (labelId == SYSTEM_SOCIAL) {
			   labelName = getMessage("social");
		   } else if (labelId == SYSTEM_PROMOTIONS) {
			   labelName = getMessage("promotions");
		   } else if (labelId == SYSTEM_UPDATES) {
			   labelName = getMessage("updates");
		   } else if (labelId == SYSTEM_FORUMS) {
			   labelName = getMessage("forums");
		   } else {
			   if (labels) {
				   labels.some(function(thisLabel) {
					   if (thisLabel.id == labelId) {
						   labelName = thisLabel.name;
						   return true;
					   }
				   });
			   }
		   }
	   }
	   
	   if (!labelName) {
		   labelName = "NewLabelMustRestartExtension";
	   }
	   
	   return labelName;
   }

   this.getLabelColor = function(labelId) {
	   	// note: there labels declared in both the MailAccount (ie. account) & MailObject (ie. mail)
		let color;
		if (labels) {
			labels.some(thisLabel => {
				if (thisLabel.id == labelId) {
					color = thisLabel.color;
					return true;
				}
			});
		}
		return color;
   }
   
   this.hasMonitoredLabel = async function(labelId, monitoredLabels) {
	   return monitoredLabels.some(monitorLabel => {
		   if (monitorLabel == labelId) {
			   return true;
		   }
	   });
   }
   
   this.setAccountId = function(id) {
	   that.id = id;
   }
   
   this.enablePushNotifications = function() {
	   console.log("enablePushNotifications: " + mailAddress);
	   return ensureGCMRegistration().then(registrationId => {

		   var data = {};
		   data.email = mailAddress;
           data.registrationId = registrationId;
           
		   // Add email/regid to datastore so watch responses know who to notify ie. extension
		   return ajax({
               type: "post",
               url: "https://cool-kit-794.appspot.com/ajax",
               contentType: "application/json",
               data: JSON.stringify(data)
            }).then(() => {
			   // Start watching
			   return that.watch();
		   });
	   }).catch(error => {
		   var MAX_RETRIES = 3;
		   if (enablePushNotificationsRetries++ < MAX_RETRIES) {
			   console.info("enablePushNotificationsRetries retry attempt #" + enablePushNotificationsRetries);
			   var exponentialRetryInSeconds = Math.pow(30, enablePushNotificationsRetries); // 30s, 15m, 7hours ...
			   setTimeout(() => {
				   that.enablePushNotifications();
			   }, seconds(exponentialRetryInSeconds));
		   }
		   return Promise.reject(error);
	   });
   }

   this.disablePushNotifications = function() {
	   return oAuthForEmails.send({userEmail:mailAddress, type:"post", url: GmailAPI.URL + "stop"});
   }
   
   this.watch = function() {
	   console.log("watch: " + mailAddress);
	   var data = {};
	   data.topicName = "projects/cool-kit-794/topics/watch";
	   data.labelFilterAction = "exclude";
	   data.labelIds = [GmailAPI.labels.SPAM, GmailAPI.labels.TRASH, GmailAPI.labels.DRAFT];
	   return oAuthForEmails.send({
           userEmail: mailAddress,
           type: "post",
           url: GmailAPI.URL + "watch",
           data: data,
           noCache: true
       }).then(async response => {
		   var watchExpiration = new Date(parseInt(response.data.expiration)); // parseInt require because expiration number is returned as a string and Date doesn't parse it
		   await that.saveSetting("watchExpiration", watchExpiration);
		   that.startWatchAlarm();
	   }).catch(error => {
		   var MAX_RETRIES = 3;
		   if (watchRetries++ < MAX_RETRIES) {
			   console.info("watch retry attempt #" + watchRetries);
			   var exponentialRetryInSeconds = Math.pow(30, watchRetries);
			   setTimeout(() => {
				   that.watch();
			   }, seconds(exponentialRetryInSeconds));
		   }
	   });
   }
   
   this.startWatchAlarm = async function() {
	   var DELAY_BETWEEN_STOP_AND_START_IN_SECONDS = 5;
	   var watchExpiration = await that.getSetting("watchExpiration");
	   if (watchExpiration) {
		   var nextWatchDate = watchExpiration.addSeconds(DELAY_BETWEEN_STOP_AND_START_IN_SECONDS);
		   console.log("nextWatchDate", nextWatchDate);
		   var alarmName = WATCH_EMAIL_ALARM_PREFIX + mailAddress;
		   chrome.alarms.create(alarmName, {when:nextWatchDate.getTime()});
	   } else {
		   console.error("Can't startWatchAlarm because no watch expiration");
	   }
   }

   this.stopWatchAlarm = function() {
	   var alarmName = WATCH_EMAIL_ALARM_PREFIX + mailAddress;
	   chrome.alarms.clear(alarmName);
   }
   
   this.isBeingWatched = async function() {
       const watchExpiration = await that.getSetting("watchExpiration");
	   return watchExpiration && watchExpiration.isAfter();
   }
   
   this.reset = function() {
	   historyId = null;
	   mailArray = [];
	   newestMailArray = [];
	   unSnoozedEmails = [];
	   emailsInAllLabels = [];
   }
   
   this.syncSignInId = function(secondCall) {
	   console.log("syncSyncInId");
	   return new Promise(function(resolve, reject) {
		   ajax(MAIL_DOMAIN_AND_PATH + "?authuser=" + encodeURIComponent(mailAddress) + "&ibxr=0").then(data => {
			   var $html = parseHtmlToJQuery(data);
			   var $metaTag = $html.find("meta[name='application-url']").first();
			   var content = $metaTag.attr("content"); // returns: https://mail.google.com/mail/u/0
			   if (content) {
				   // Patch: seems that on the first call to ?authuser after granting access the response points to /u/0 always, I think by caling it once it then signs in correctly and you can call ?authuser again to get the right index
				   var emails = extractEmails(data);
				   if (emails && emails.length && emails.first() == mailAddress) {
					   var parts = content.match(/u\/(\d+)/);
					   var id = parts[1];
					   console.log("setting " + mailAddress + " to id: " + id);
					   that.setAccountId(id);
					   resolve();
				   } else {
					   if (secondCall) {
						   console.log("failed after 2 consecutive authuser calls");
						   reject(new Error("Could not find email in response - might be signed out [12]"));
					   } else {
						   console.log("did not find matching email in authuser response, so call it again");
						   that.syncSignInId(true).then(function() {
							   resolve();
						   }).catch(function(errorResponse) {
							   reject(errorResponse);
						   });
					   }
				   }
			   } else {
				   reject(new Error("Could not find email in response - might be signed out"));
			   }
		   }, jqXHR => {
			   reject(jqXHR.statusText);
		   });
	   });
   }
   
   this.fetchThreads = function(mailArray) {
	   // accounts count will be 0 when you start the extension or pollAccounts (that's ok because initMailAccount sets accounts to 0) once the interval calls this function then the accounts should be 1 or + 
	   var maxGetThreads;
	   if (bg.accounts.length) {
		   // do this to prevent locked accounts (note it used be 20 and no averaging so 20 for each account, i'm such an idiot
		   maxGetThreads = 5 / bg.accounts.length; // because this method will be called for each accounts let's average the number of threads per account
	   } else {
		   maxGetThreads = 1;
	   }
	   
	   var getThreadsCount = 0;
	   var promises = [];
	   
	   $.each(mailArray, function(i, email) {
		   // lots of peeps in the thread so this might be a reply to a conversation (but which was already 'read' by user before so this check does not know the thread's past or initial email etc.) (and thus the summary in the Gmail's feed will not match what this sender wrote, but rather it matches summary of the first email in this thread
		   if (true) { //email.contributors.length || storage.get("spokenWordsLimit") == "paragraph" || storage.get("spokenWordsLimit") == "wholeEmail") { 
			   //console.log("has contributors: " + email.contributors.length + " or spokenwordslimit high");
			   if (getThreadsCount < maxGetThreads) {
				   var promise = email.getThread();
				   promises.push(promise);
				   getThreadsCount++;
			   } else {
				   console.warn("MAX fetch last conversations reached, ignoring now.");						   
			   }
		   }
	   });
	   
	   if (promises.length) {
		   console.log("fetchThreads: ", promises);
	   }
	   
	   return Promise.all(promises);
   }
   
   function initLabelDetails(mailObject) {
	   var label = mailObject.monitoredLabel;
	   if (label == SYSTEM_INBOX) {
		   mailObject.formattedLabel = getMessage("inbox");
		   mailObject.labelSortIndex = 0;
	   } else if (label == SYSTEM_IMPORTANT || label == SYSTEM_IMPORTANT_IN_INBOX) {
		   mailObject.formattedLabel = getMessage("importantMail");
		   mailObject.labelSortIndex = 1;
	   } else if (label == SYSTEM_ALL_MAIL) {
		   mailObject.formattedLabel = getMessage("allMail");
		   mailObject.labelSortIndex = 2;
	   } else if (label == SYSTEM_PRIMARY) {
		   mailObject.formattedLabel = getMessage("primary");
		   mailObject.labelSortIndex = 3;
	   } else if (label == SYSTEM_PURCHASES) {
		   mailObject.formattedLabel = getMessage("purchases");
		   mailObject.labelSortIndex = 4;
	   } else if (label == SYSTEM_FINANCE) {
		   mailObject.formattedLabel = getMessage("finance");
		   mailObject.labelSortIndex = 5;
	   } else if (label == SYSTEM_SOCIAL) {
		   mailObject.formattedLabel = getMessage("social");
		   mailObject.labelSortIndex = 6;
	   } else if (label == SYSTEM_PROMOTIONS) {
		   mailObject.formattedLabel = getMessage("promotions");
		   mailObject.labelSortIndex = 7;
	   } else if (label == SYSTEM_UPDATES) {
		   mailObject.formattedLabel = getMessage("updates");
		   mailObject.labelSortIndex = 8;
	   } else if (label == SYSTEM_FORUMS) {
		   mailObject.formattedLabel = getMessage("forums");
		   mailObject.labelSortIndex = 9;
	   } else {
		   mailObject.formattedLabel = mailObject.account.getLabelName(label);
		   if (mailObject.formattedLabel) {
			   mailObject.labelSortIndex = mailObject.formattedLabel.toLowerCase().charCodeAt(0);
		   } else {
			   // empty label, might have once been monitored but now label removed and marked as spam or something
			   // let's move it to the end of the list
			   mailObject.labelSortIndex = 10;
		   }
	   }
   }
   
   function initNewestEmails(mailObject) {
	   initLabelDetails(mailObject);
	   
	   // logic mainly for auto-detect
	   // check if this email appeared in previous label fetches (ie. it was labeled with multiple labels) if so then avoid adding this email again
	   var emailAlreadyFoundInADifferentLabelFetch;
	   //var foundInPrimaryAndInbox;
	   
	   emailsInAllLabels.forEach(function(emailInAllFeeds) {
		   //console.log("emailsInAllLabels", mailObject, emailInAllFeeds);
		   if (emailInAllFeeds.id == mailObject.id) {
			   
			   if (accountAddingMethod == "autoDetect") {
				   // only for auto-detect because oauth can retrieve all the labels for an email
				   emailInAllFeeds.labels.push( mailObject.monitoredLabel );
			   }
			   
			   if (isMainCategory(mailObject.monitoredLabel) && emailInAllFeeds.monitoredLabel == SYSTEM_INBOX) {
				   // do nothing
				   //foundInPrimaryAndInbox = true;
			   } else {
				   emailAlreadyFoundInADifferentLabelFetch = true;
			   }

		   }
	   });
	   
	   //console.log("emailAlreadyFoundInADifferentLabelFetch: " + emailAlreadyFoundInADifferentLabelFetch);
	   if (!emailAlreadyFoundInADifferentLabelFetch) {
		   emailsInAllLabels.push(mailObject);
		   
		   var mailAlreadyExisted = mailArray.some(function(oldMail) {
			   if (oldMail.id == mailObject.id) {
				   return true;
			   }
		   });
		   if (!mailAlreadyExisted) {
			   newestMailArray.push(mailObject);
		   }
	   }
	   return {emailAlreadyFoundInADifferentLabelFetch:emailAlreadyFoundInADifferentLabelFetch};
   }
   
   function syncMailArray() {
	   // remove emails that have disappeared from the feed (user could have done any number of actions on the emails via the gmail.com etc.
	   for (var a=0; a<mailArray.length; a++) {
		   var emailStillInFeed = false; 
		   for (var b=0; b<emailsInAllLabels.length; b++) {
			   if (mailArray[a].id == emailsInAllLabels[b].id) {
				   emailStillInFeed = true;
				   break;
			   }
		   }
		   if (!emailStillInFeed) {
			   console.log("removing: " + mailArray[a].title);
			   mailArray.splice(a, 1);
			   a--;
		   }
	   }
	   
	   // commented this because i was creating a new array and break polymer's data binding
	   //mailArray = mailArray.concat(newestMailArray);
	   // this will alter the mailArray and keep the polymer data binding
	   Array.prototype.push.apply(mailArray, newestMailArray);

	   sortMailArray();
   }
   
   function sortMailArray() {
	   mailArray.sort(function (a, b) {
		   if (a.monitoredLabel == b.monitoredLabel) {
			   if (a.issued > b.issued)
				   return -1;
			   if (a.issued < b.issued)
				   return 1;
			   return 0;
		   } else {
                if (a.labelSortIndex < b.labelSortIndex) {
                    return -1;
                } else if (a.labelSortIndex > b.labelSortIndex) {
                    return 1;
                } else {
                    return 0;
                }
		   }
	   });
   }
   
   this.getError = function(useHtml, document) {
	   var error;
	   var niceError;
	   var instructions = "";
	   var $instructions = $("<span>", document); // need to pass context/document or else polymer elements are not rendered in the caller ie. popup.html
	   var $refreshHtml = $("<paper-button class='refreshAccount'>", document).text(getMessage("refresh"));
	   
	   console.log("online: " + navigator.onLine);

	   if (that.errorCode === 0) {
		   error = JError.NETWORK_ERROR;
		   niceError = "Network error!";
	   } else if (that.errorCode == ErrorCodes.RATE_LIMIT_EXCEEDED) {
		   error = JError.RATE_LIMIT_EXCEEDED;
		   niceError = "Rate limit exceeded!";
	   } else if (that.errorCode == ErrorCodes.BAD_REQUEST || that.errorCode == ErrorCodes.UNAUTHORIZED) {
		   error = JError.ACCESS_REVOKED;
		   niceError = "Access was revoked!";
	   } else if (that.error == JError.NO_TOKEN_FOR_EMAIL) {
		   error = JError.NO_TOKEN_FOR_EMAIL;
		   niceError = "No access token.";
	   } else if (that.error == JError.CANNOT_ENSURE_MAIN_AND_INBOX_UNREAD) {
		   error = JError.CANNOT_ENSURE_MAIN_AND_INBOX_UNREAD;
		   niceError = "Too many unread emails.";
	   } else if (that.errorCode == 404) {
		   error = JError.MIGHT_BE_OFFLINE;
		   niceError = "Might be offline.";
	   } else if (that.errorCode == 503) {
		   error = JError.GMAIL_BACK_END;
		   niceError = "Gmail service issue: " + that.error;
	   } else if (that.error == "The user is not signed in.") { // happens with not signed into Chrome
		   error = JError.NOT_SIGNED_IN;
		   niceError = "Not signed in.";
	   } else if (that.error == "OK") {
		   niceError = "";
	   } else {
		   error = that.error;
		   niceError = that.error;
	   }
	   
	   function createButton(url, textKey) {
		   return $("<a class='inherit' target='_blank'>", document).attr("href", url).append($("<paper-button>", document).text(getMessage(textKey)));
	   }
	   
	   if (accountAddingMethod == "autoDetect") {
		   if (that.errorCode == JError.GOOGLE_ACCOUNT_WITHOUT_GMAIL) {
			   if (useHtml) {
				   $instructions.append( createButton("https://jasonsavard.com/wiki/Google_Accounts_without_Gmail?ref=autoDetectPopupError", "moreInfo") );
			   } else {
				   instructions = "Only Gmail or Google Apps can be polled";
			   }
		   } else if (that.errorCode == JError.GMAIL_NOT_ENABLED) {
			   if (useHtml) {
				   $instructions.append( createButton("https://support.google.com/a/answer/57919", "moreInfo") );
			   } else {
				   instructions = "You must enable the Gmail service in your Admin console";
			   }
		   } else if (that.errorCode == JError.COOKIE_PROBLEMS) {
			   if (useHtml) {
				   $instructions.append(createButton("https://accounts.google.com/CookieMismatch", "moreInfo"));
			   } else {
				   instructions = "Make sure your cookies are enabled. Clear cache and cookies. Adjust your privacy settings to allow www.google.com";
			   }
		   } else if (that.errorCode == JError.CANNOT_ENSURE_MAIN_AND_INBOX_UNREAD) {
			   if (useHtml) {
				   $instructions.append("Use the ", createButton("options.html?ref=cannotEnsureMainAndInbox&highlight=addAccount#accounts", "addAccount"), "option instead!");
			   } else {
				   instructions = "Use the Add Accounts option instead!";
			   }
		   } else if (DetectClient.isFirefox() && navigator.doNotTrack) {
				if (useHtml) {
					$instructions.append("Use ", createButton("options.html?ref=doNotTrack&highlight=addAccount#accounts", "addAccount"), " instead or try setting the default Tracking Protection back to 'Only in private windows'");
				} else {
					instructions = JError.DO_NOT_TRACK_MESSAGE;
				}
		   } else {
			   if (useHtml) {
				   $instructions.append($refreshHtml, createButton("https://jasonsavard.com/wiki/Auto-detect_sign_in_issues?ref=autoDetectPopupError", "help"));
			   } else {
				   instructions = "Refresh or try signing out/in or " + getMessage("addAccount");
			   }
		   }
	   } else {
		   if (error == JError.ACCESS_REVOKED || error == JError.NO_TOKEN_FOR_EMAIL || error == JError.NOT_SIGNED_IN) {
			   instructions = "";
			   if (useHtml) {
				   if (error == JError.ACCESS_REVOKED) {
					   $instructions.append($refreshHtml, " or ");
				   }
				   $instructions.append( createButton("options.html#accounts", "addAccount"), "to re-grant access!" );
			   } else {
				   if (error == JError.ACCESS_REVOKED) {
					   instructions += "Refresh or ";
				   }
				   instructions += getMessage("addAccount") + " to re-grant access!";
			   }
		   } else {
			   if (useHtml) {
				   $instructions.append($refreshHtml);
			   } else {
				   instructions = getMessage("refresh");
			   }
		   }
	   }
	   
	   return {error:error, niceError:niceError, instructions:instructions, $instructions:$instructions};
   }
   
   function getMessageIdFromAtomFeedEntry($entry) {
	   var link = $entry.find('link').attr('href');
	   var id = link.replace(/.*message_id=(\d\w*).*/, "$1");
	   return id;
   }
   
   function getHistoryActions(history) {
	   var historyActions;
	   var deleted;
	   
	   if (history.messagesAdded) {
		   historyActions = history.messagesAdded;
	   } else if (history.messagesDeleted) {
		   historyActions = history.messagesDeleted;
		   deleted = true;
	   } else if (history.labelsAdded) {
		   historyActions = history.labelsAdded;
	   } else if (history.labelsRemoved) {
		   historyActions = history.labelsRemoved;
	   } else {
		   historyActions = [];
	   }
	   
	   return {historyActions:historyActions, deleted:deleted};
   }
   
   function isUnread(labelIds) {
	   return labelIds && labelIds.indexOf(GmailAPI.labels.UNREAD) != -1 && labelIds.indexOf(GmailAPI.labels.SPAM) == -1 && labelIds.indexOf(GmailAPI.labels.TRASH) == -1;
   }
   
   function passesLabelTests(historyMessage, monitoredLabels) {
	   var testFlag;
	   
	   if (monitoredLabels.indexOf(SYSTEM_ALL_MAIL) != -1) {
		   testFlag = true;
	   } else {
		   testFlag = monitoredLabels.some(function(monitoredLabel) {
			   if (historyMessage.labelIds && historyMessage.labelIds.indexOf(getGmailAPILabelId(monitoredLabel)) != -1) {
				   if (isMainCategory(monitoredLabel) || monitoredLabel == SYSTEM_IMPORTANT_IN_INBOX) { // check that INBOX is there if monitoring a main category or important+inbox label
					   if (historyMessage.labelIds && historyMessage.labelIds.indexOf(GmailAPI.labels.INBOX) != -1) {
						   return true;
					   }
				   } else {
					   return true;
				   }
			   }
		   });
	   }
	   
	   return testFlag;
   }
   
   // Retreives inbox count and populates mail array
   this.getEmails = async function(params) {
	   params = initUndefinedObject(params);
	   that.lastGetEmailsDate = new Date();
	   
        const accountMonitorLabels = await that.getMonitorLabels();

        if (accountAddingMethod == "autoDetect") {
            const fetchEmailsResponse = await fetchEmailsByLabel({monitorLabels:accountMonitorLabels, monitorLabelsIndex:0, feedsArrayInfo:[]});
            var inboxFeed;

            that.unreadCount = 0;
            
            emailsInAllLabels = [];
            newestMailArray = [];
            
            var mainCategoryFeeds = [];
            
            if (fetchEmailsResponse.feedsArrayInfo) {
                $.each(fetchEmailsResponse.feedsArrayInfo, function(feedInfoIndex, feedInfo) {
                    
                    if (feedInfo.label == SYSTEM_INBOX) {
                        inboxFeed = feedInfo;
                    }
                    if (isMainCategory(feedInfo.label)) {
                        mainCategoryFeeds.push(feedInfo);
                    } else {
                        // if NOT main categegory then add here else we add the unread count only if matches main+inbox refer to ensureUnreadAndInbox...
                        that.unreadCount += feedInfo.feedUnreadCount;
                    }
                    
                    // Parse xml data for each mail entry
                    feedInfo.parsedFeed.find('entry').each(function () {
                        
                        var $entry = $(this);
                        
                        var title = $entry.find('title').text();
                        
                        var summary = $entry.find('summary').text();
                        summary = filterEmailBody(title, summary);
                        
                        var issued = Date.parse($entry.find('issued').text());
                        
                        var imapMessageId = $entry.find('id').text().split(":")[2]; // ex. fetch the last number for the messageid... tag:gmail.google.com,2004:1436934733284861101
                        
                        var id = getMessageIdFromAtomFeedEntry($entry);
                        
                        var authorName = $entry.find('author').find('name').text();
                        var authorMail = $entry.find('author').find('email').text();
                        var contributors = $entry.find("contributor");
                        
                        // Encode content to prevent XSS attacks
                        // commend title one because & was converted to &amp; in subject lines 
                        //title = html_sanitize(title);
                        summary = html_sanitize(summary);
                        authorMail = html_sanitize(authorMail);							   
                        
                        var mailObject = new MailObject();
                        mailObject.account = that;
                        mailObject.id = id;
                        mailObject.imapMessageId = imapMessageId;
                        mailObject.title = title;
                        mailObject.summary = summary;
                        mailObject.issued = issued;
                        mailObject.authorName = authorName;
                        mailObject.authorMail = authorMail;
                        mailObject.labels = [feedInfo.label]; // initialize array and make first item in array the default label
                        mailObject.monitoredLabel = feedInfo.label;
                        mailObject.contributors = contributors;
                        
                        var newestEmailsResponse = initNewestEmails(mailObject);
                        if (newestEmailsResponse.emailAlreadyFoundInADifferentLabelFetch) {
                            that.unreadCount--;
                        }
                    });
                });
            }
            
            try {
                await ensureUnreadAndInboxForMultipleFeeds(mainCategoryFeeds, inboxFeed);
                syncMailArray();
                
                fetchEmailsResponse.mailAccount = that;
                fetchEmailsResponse.newestMailArray = newestMailArray;
                
                if (newestMailArray.length) {
                    await that.fetchThreads(newestMailArray);
                }
                return fetchEmailsResponse;
            } catch (error) {
                console.error(error);
                
                if (error == JError.CANNOT_ENSURE_MAIN_AND_INBOX_UNREAD) {
                    that.error = "Too many unread emails.";
                    that.errorCode = JError.CANNOT_ENSURE_MAIN_AND_INBOX_UNREAD;
                } else {
                    that.error = error;
                }
                
                // always set an error field to the account before rejecting
                throw error;
            }
        } else {
            // added accounts
            
            function setAccountError(account, error) {
                account.error = error;
                account.errorCode = error.code;
                
                console.log("setaccounterror online: " + navigator.onLine);

                if (error == "timeout") {
                    // don't have to display it again since it's logged already
                } else if (error.code == ErrorCodes.RATE_LIMIT_EXCEEDED) {
                    logError("Caught rate limit exceeded");
                } else {
                    error += " code: " + error.code;
                    if (error.stack) {
                        error += " stack: " + error.stack;
                    }
                    console.error("setAccountError: ", error);
                }
            }
            
            async function getInitialMessages(params) {
                // only pass history id (if we want to skip calling getHistoryForFirstTime again)
                const accountMonitorLabels = await params.account.getMonitorLabels();
                try {
                    const newestMailArray = await getMessagesByList({monitoredLabels:accountMonitorLabels, historyId:params.historyId});
                    params.getEmailsResponse.newestMailArray = newestMailArray;
                    return params.getEmailsResponse;
                } catch (error) {
                    setAccountError(that, error);
                    throw error;
                }
            }
            
            function getMatchingMail(message) {
                var index;
                var matchingMail;
                var existingMessage;
                
                if (conversationView) {
                    index = getMailArrayIndexByThreadId(message.threadId);
                } else {
                    index = getMailArrayIndexByMessageId(message.id);
                }
                
                if (index != -1) {
                    matchingMail = mailArray[index];
                    var messageFound = matchingMail.messages.some(matchingMessage => {
                        console.log("loop messages", matchingMessage);
                        if (message.id == matchingMessage.id) {
                            console.log("existing", matchingMessage)
                            existingMessage = matchingMessage;
                            return true;
                        }
                    });
                }
                
                return {index:index, matchingMail:matchingMail, existingMessage:existingMessage};
            }

            try {
                // call this to load labels
                await that.getLabels(params.refresh);
                that.error = null;
                that.errorCode = null;
                
                var getEmailsResponse = {};
                getEmailsResponse.mailAccount = that;
                
                newestMailArray = [];
                unSnoozedEmails = [];
                
                const monitoredLabels = await that.getMonitorLabels();
                const showSnoozedNotifications = await storage.get("showSnoozedNotifications");

                if (historyId) {
                    var getMessagesByHistoryParams = {historyId:historyId, histories:[]};
                    try {
                        const messagesByHistoryResponse = await getMessagesByHistory(getMessagesByHistoryParams);
                        var histories = getMessagesByHistoryParams.histories;
                        if (histories && histories.length) {
                            
                            var processedMessageIds = [];
                            var messagesToFetch = [];
                            var mergeUnreadRelativeCount = 0;
                            
                            histories.forEach((history, historyIndex) => {
                                var historyActionsResponse = getHistoryActions(history);
                                historyActionsResponse.historyActions.forEach(historyAction => {
                                    
                                    // message could be listed several times in history so only process this message once
                                    if (processedMessageIds.indexOf(historyAction.message.id) == -1) {
                                        processedMessageIds.push(historyAction.message.id);
                                        
                                        var message = historyAction.message;
                                        
                                        // possibly replace message with last message for this message id, because it could have had multiple actions performed on it
                                        for (var a=histories.length-1; a>historyIndex; a--) {
                                            var lastHistoryActionsResponse = getHistoryActions(histories[a]);
                                            var lastHistoryActionFound = lastHistoryActionsResponse.historyActions.some(lastHistoryAction => {
                                                if (lastHistoryAction.message.id == historyAction.message.id) {
                                                    console.log("matched more recent history", lastHistoryAction);
                                                    historyActionsResponse = lastHistoryActionsResponse;
                                                    message = lastHistoryAction.message;
                                                    return true;
                                                }
                                            });
                                            if (lastHistoryActionFound) {
                                                break;
                                            }
                                        }
                                        
                                        console.log("message", message);
                                        
                                        var showMailInPopup = !historyActionsResponse.deleted && isUnread(message.labelIds) && passesLabelTests(message, monitoredLabels);
                                        console.log("showMailInPopup: " + showMailInPopup + " " + isUnread(message.labelIds) + " " + passesLabelTests(message, monitoredLabels));
                                        var matchingMailResponse = getMatchingMail(message);
                                        
                                        if (matchingMailResponse.matchingMail) {
                                            if (showMailInPopup) {
                                                // merge messages
                                                if (matchingMailResponse.existingMessage) {
                                                    // update labels, they *might have changed
                                                    matchingMailResponse.matchingMail.labels = message.labelIds;
                                                } else {
                                                    messagesToFetch.push(message);
                                                }
                                            } else { // is no longer unread (maybe deleted, archive or marked as read etc.)
                                                console.log("remove message: " + message.id);
                                                matchingMailResponse.matchingMail.removeMessageById(message.id);
                                                
                                                // if all messages from thread are no longer unread then remove it from the array
                                                var allMessagesRead = matchingMailResponse.matchingMail.messages.every(function(message) {
                                                    return !isUnread(message.labels);
                                                });
                                                
                                                if (allMessagesRead) {
                                                    mailArray.splice(matchingMailResponse.index, 1);
                                                    mergeUnreadRelativeCount--;
                                                }
                                            }
                                        } else {
                                            if (showMailInPopup) {
                                                messagesToFetch.push(message);
                                            } else {
                                                // 1) we might have removed it immediately after user action like mark as read
                                                // 2) was never in the mailarray and is still not unread: so ignore it :)
                                                // 3) might be unsnoozed

                                                // Detect unsnoozed email
                                                if (showSnoozedNotifications) {
                                                    if (histories[historyIndex].labelsAdded) {
                                                        let labelIds = histories[historyIndex].labelsAdded[0].labelIds;
                                                        if (labelIds.length == 1 && labelIds.indexOf(GmailAPI.labels.INBOX) != -1) {
                                                            console.log("unsnoozed", message);
                                                            message.unSnoozed = true;
                                                            messagesToFetch.push(message);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                });
                                
                            });
                            
                            const fetchMessagesByIdsResponse = await fetchMessagesByIds(messagesToFetch);
                            var createResponse = await createMailObjects({httpBodies:fetchMessagesByIdsResponse.httpBodies});
                            createResponse.mailObjects.forEach(function(historyMailObject) {
                                // Not Found, so let's generate a stub to pass to mergeMailObject to remove it
                                if (historyMailObject.jerror == JError.NOT_FOUND) {
                                    console.error("not found - should i do something", historyMailObject);
                                } else {
                                    if (historyMailObject.unSnoozed && !isUnread(historyMailObject.labelIds)) {
                                        unSnoozedEmails.push(historyMailObject);
                                    } else {
                                        var matchingMailResponse = getMatchingMail(historyMailObject);
                                        if (matchingMailResponse.matchingMail) {
                                            // merge messages
                                            matchingMailResponse.matchingMail.messages.forEach(function(matchingMessage) {
                                                var historyMessageFound = historyMailObject.getMessageById(matchingMessage.id);
                                                if (!historyMessageFound) {
                                                    historyMailObject.messages.push(matchingMessage);
                                                }
                                            });
                                            
                                            historyMailObject.sortMessages();

                                            // let's add this new mailobject to queue and remove it after merging the messages
                                            mailArray.push(historyMailObject);
                                            mailArray.splice(matchingMailResponse.index, 1);
                                        } else {
                                            mailArray.push(historyMailObject);
                                            mergeUnreadRelativeCount++;
                                        }
                                        newestMailArray.push(historyMailObject);
                                        
                                        initLabelDetails(historyMailObject);
                                    }
                                }
                            });

                            sortMailArray();
                            
                            getEmailsResponse.newestMailArray = newestMailArray;
                            getEmailsResponse.unSnoozedEmails = unSnoozedEmails;
                            
                            // Fixes this issue: when many emails are unread and you mark some older emails as read it does not reduce the count
                            // if already displaying more emails then the maximum allowed - then we fetch the unreadcount - because we can't rely on detecting if emails were removed since they may not have previously been fetched due to my max limits
                            if (that.unreadCount >= MAX_EMAILS_TO_FETCH) {
                                try {
                                    that.unreadCount = await fetchUnreadCount(monitoredLabels, true);
                                } catch (error) {
                                    // ignore error let's just use the other logic...
                                    that.unreadCount += mergeUnreadRelativeCount;
                                }
                            } else {
                                that.unreadCount += mergeUnreadRelativeCount;
                            }

                            // this was put in place when monitoring primary label - because we use the resultSizeEstimate which can be wrong - but the newestMailArray should be accurate
                            if (mailArray.length < that.unreadCount || mailArray.length < MAX_EMAILS_TO_FETCH) {
                                that.unreadCount = mailArray.length;
                            }
                        }

                        historyId = messagesByHistoryResponse.historyId;
                        return getEmailsResponse;
                    } catch (error) {
                        console.error("error", error);
                        if (error.jreason == JError.HISTORY_INVALID_OR_OUT_OF_DATE || error.jreason == JError.TOO_MANY_HISTORIES || error == JError.EXCEEDED_MAXIMUM_CALLS_PER_BATCH) {
                            // Must reinitalize
                            console.log(error.jreason + " - let's reinitalize mail");
                            historyId = null;
                        } else {
                            setAccountError(that, error);
                            throw error;
                        }
                    }
                }
                return getInitialMessages({account:that, getEmailsResponse:getEmailsResponse});
            } catch (error) {
                setAccountError(that, error);
                throw error;
            }
        }

	   //countEvent("getEmails");
   }
   
   function getMessagesByList(messagesByListParams) {
	   console.log("getMessagesByList");
	   
	   return new Promise((resolve, reject) => {
		   
		   that.unreadCount = 0;
		   emailsInAllLabels = [];
	
		   var currentHistoryId;
		   
		   var promises = [];
		   promises.push(fetchUnreadCount(messagesByListParams.monitoredLabels));
		   promises.push(new Promise((resolve, reject) => {
			   // if we already have history then let's just pass it forward
			   if (messagesByListParams.historyId) {
				   resolve({historyId:messagesByListParams.historyId});
			   } else {
				   getHistoryForFirstTime().then(response => {
					   resolve(response);
				   }).catch(errorResponse => {
					   reject(errorResponse);
				   });
			   }
		   }));
		   
		   Promise.all(promises).then(promiseAllResponse => {
			   // fetchUnreadCount response
			   that.unreadCount = promiseAllResponse[0];
			   // getHistoryForFirstTime response
			   return promiseAllResponse[1]; 
		   }).then(historyResponse => {
			   currentHistoryId = historyResponse.historyId;
			   return getMessages(messagesByListParams.monitoredLabels, async function(getMessagesResponse) {
				   if (getMessagesResponse.fetchMessagesByLabelsResponse) {
					   that.unreadCount -= getMessagesResponse.fetchMessagesByLabelsResponse.oauthEmailAlreadyFoundInADifferentLabelFetch;

					   //that.unreadCount = getMessagesResponse.fetchMessagesByLabelsResponse.totalMessages;
                       console.log("fetchMessagesByLabelsResponse", getMessagesResponse.fetchMessagesByLabelsResponse);
                       await asyncForEach(getMessagesResponse.fetchMessagesByLabelsResponse.responses, async response => {
						   var createResponse = await createMailObjects(response);
						   
						   createResponse.mailObjects.forEach(mailObject => {
							   initNewestEmails(mailObject);
                           });
                       });

					   // add with inbox count
					   getMessagesResponse.fetchMessageIdsByLabelsResponse.httpBodies.some(function(httpBody) {
						   //if ((httpBody.monitoredLabel == SYSTEM_INBOX && that.getSetting("openLinksToInboxByGmail")) || httpBody.monitoredLabel == SYSTEM_PRIMARY) {
						   if (isMainCategory(httpBody.monitoredLabel)) {
							   //mailArray if (mailArray.length < that.unreadCount || mailArray.length < MAX_EMAILS_TO_FETCH) {
							   
							   that.unreadCount += httpBody.resultSizeEstimate;
							   
							   if (newestMailArray.length < that.unreadCount && that.unreadCount < MAX_EMAILS_TO_FETCH) {
								   that.unreadCount = newestMailArray.length;
							   }
							   
							   //return true;
						   }
					   });

				   } else {
					   // no unread messages
					   console.log("no unread messages");
				   }
			   });
		   }).then(() => {
			   syncMailArray();
			   historyId = currentHistoryId;
			   resolve(newestMailArray);
		   }).catch(errorResponse => {
			   console.error(errorResponse);
			   reject(errorResponse);
		   });
	   });
   }
   
   function getMailArrayIndexByThreadId(threadId) {
	   for (var a=0; a<mailArray.length; a++) {
		   if (mailArray[a].threadId == threadId) {
			   return a;
		   }
	   }
	   return -1;
   }

   function getMailArrayIndexByMessageId(messageId) {
	   for (var a=0; a<mailArray.length; a++) {
		   if (mailArray[a].id == messageId) {
			   return a;
		   }
	   }
	   return -1;
   }
   
   function getMessagesByHistory(params) {
	   return new Promise((resolve, reject) => {
		   getHistory(params).then(historyResponse => {
			   // if exists history[] then we've had changes since the last historyid - so let's fetch emails
			   if (historyResponse.history) {
				   console.log("history exists");
				   params.histories = params.histories.concat(historyResponse.history);
	
				   // Too many histories so let's just resync
				   if (historyResponse.nextPageToken) {
					   console.log("next page");
					   params.nextPageToken = historyResponse.nextPageToken;
					   if (!params.nextPageTokenCount) {
						   params.nextPageTokenCount = 0;
					   }
					   if (++params.nextPageTokenCount >= MAX_HISTORY_NEXT) {
						   historyResponse.jreason = JError.TOO_MANY_HISTORIES;
						   reject(historyResponse);
					   } else {
						   return getMessagesByHistory(params);
					   }
				   } else {
					   resolve(historyResponse);
				   }
			   } else { // no changes
				   console.log("no changes");
				   resolve(historyResponse);
			   }
		   }).then(historyResponse => {
			   // done
			   resolve(historyResponse);
		   }).catch(errorResponse => {
			   reject(errorResponse);
		   });
	   });
   }
   
   function getMessages(labels, processMessages) {
	   return new Promise(function(resolve, reject) {
		   fetchMessageIdsByLabels(labels).then(async function(fetchMessageIdsByLabelsResponse) {
			   console.log("fetchMessageIdsByLabelsResponse", fetchMessageIdsByLabelsResponse);
			   // detect if any messages found
			   var messagesFound = fetchMessageIdsByLabelsResponse.httpBodies.some(function(httpBody) {
				   if (httpBody.messages && httpBody.messages.length) {
					   return true;
				   }
			   });
			   if (messagesFound) {
				   fetchMessagesByLabels(fetchMessageIdsByLabelsResponse).then(async function(fetchMessagesByLabelsResponse) {
					   await processMessages({fetchMessageIdsByLabelsResponse:fetchMessageIdsByLabelsResponse, fetchMessagesByLabelsResponse:fetchMessagesByLabelsResponse});
					   resolve();
				   }).catch(function(errorResponse) {
					   reject(errorResponse);
				   });
			   } else {
				   // should still execute processMessages
				   await processMessages({fetchMessageIdsByLabelsResponse:fetchMessageIdsByLabelsResponse, labelsWithoutMessages:labels});
				   resolve();
			   }
		   }).catch(function(errorResponse) {
			   reject(errorResponse);
		   });
	   });
   }
   
   function generateFetchMessagesByIdsParams(params) {
	   var oauthEmailAlreadyFoundInADifferentLabelFetch = 0;
	   var messages = [];
	   params.httpMessages.forEach(function(httpMessage) {
		   if (params.allLabelsMessageIdsToFetch && params.allLabelsMessageIdsToFetch.indexOf(httpMessage.id) != -1) {
			   console.log("skip this message because already queued from another label: " + httpMessage.id);
			   oauthEmailAlreadyFoundInADifferentLabelFetch++;
		   } else {
			   var message = {id: httpMessage.id, monitoredLabel:httpMessage.monitoredLabel};
			   messages.push(message);
			   params.allLabelsMessageIdsToFetch.push(httpMessage.id);
		   }
	   });
	   
	   return {messages:messages, oauthEmailAlreadyFoundInADifferentLabelFetch:oauthEmailAlreadyFoundInADifferentLabelFetch};
   }
   
   function fetchMessagesByLabels(fetchMessageIdsByLabelsResponse) {
	   return new Promise(function(resolve, reject) {
		   var fetchMessagesByIdsPromises = [];
		   var errors = [];

		   var allLabelsMessageIdsToFetch = [];
		   var oauthEmailAlreadyFoundInADifferentLabelFetch = 0;

		   fetchMessageIdsByLabelsResponse.httpBodies.forEach(function(httpBody) {
			   if (httpBody.error) {
				   errors.push(httpBody);
			   } else if (httpBody.messages) {
				   
				   httpBody.messages.forEach(function(httpMessage) {
					   httpMessage.monitoredLabel = httpBody.monitoredLabel;
				   });
				   
				   var fetchMessagesByIdsParams = generateFetchMessagesByIdsParams({httpMessages:httpBody.messages, allLabelsMessageIdsToFetch:allLabelsMessageIdsToFetch});
				   // must append this int variable outside of function because it's not passed by reference (but the array allLabelMessages... is)
				   oauthEmailAlreadyFoundInADifferentLabelFetch += fetchMessagesByIdsParams.oauthEmailAlreadyFoundInADifferentLabelFetch;

				   if (fetchMessagesByIdsParams.messages.length) {
					   var fetchMessagesByIdsPromise = fetchMessagesByIds(fetchMessagesByIdsParams.messages);
					   fetchMessagesByIdsPromises.push(fetchMessagesByIdsPromise);
				   }
			   }
		   });
		   
		   Promise.all(fetchMessagesByIdsPromises).then(function(fetchMessagesByIdsPromisesResponses) {
			   if (errors.length) {
				   console.error("found some errors[]", errors);
				   reject(errors);
			   } else {
				   resolve({responses:fetchMessagesByIdsPromisesResponses, oauthEmailAlreadyFoundInADifferentLabelFetch:oauthEmailAlreadyFoundInADifferentLabelFetch});
			   }
		   }).catch(function(errorResponse) {
			   console.error("PromiseAll errors", errorResponse);
			   reject(errorResponse);
		   });
	   });
   }
   
   async function createMailObjects(params) {
       const monitoredLabels = await that.getMonitorLabels();

	   var mailObjects = [];
       var totalMessagesThatWereGrouped = 0;
       
	   params.httpBodies.forEach(function(httpBody) {

			var mailObject = new MailObject();
			mailObject.unSnoozed = httpBody.unSnoozed;

		   // might be permanently deleted
		   if (httpBody.jerror == JError.NOT_FOUND) { //if (httpBody.error && httpBody.error.code == 404) { // message == Not Found  (might have been permanently deleted)
			   // just push error object into array and continue loop
			   mailObject.account = that;
			   mailObject.labels = [];
			   mailObject.messages = [];
			   mailObject.jerror = httpBody.jerror;
			   mailObjects.push(mailObject);
			   return;
		   } else if (httpBody.error) {
			   console.error("in createmailbojects, this body has this error: " + httpBody.error.message);
			   return;
		   }
		   
		   var headers = httpBody.payload.headers;
		   
		   if (conversationView) {
			   // group emails by threadid
			    var threadFound = mailObjects.some(function(existingMailObject) {
			    	console.log("find thread", existingMailObject.threadId + " " + httpBody.threadId)
				   if (existingMailObject.threadId == httpBody.threadId) {
					   var message = generateMessageFromHttpResponseMessage(existingMailObject, httpBody);
					   // add to beginning of array
					   existingMailObject.messages.unshift(message);
					   totalMessagesThatWereGrouped++;
					   return true;
				   }
			   });
			   
			   if (threadFound) {
				   // continue the "batchResponse.httpResponses.forEach" above
				   return;
			   }
		   }
		   
		   var subject = cleanEmailSubject(MyGAPIClient.getHeaderValue(headers, "Subject"));
		   console.log("subject: " + subject);
		   if (!subject) {
			   subject = "";
		   }

		   var summary = httpBody.snippet;
		   summary = filterEmailBody(subject, summary);
		   
		   var issued = getDateFromHttpResponseMessage(httpBody);
		   var from = MyGAPIClient.getHeaderValue(headers, "From");
		   
		   var authorName;
		   var authorMail;
		   
		   var addressObj = addressparser(from).first();
		   if (addressObj) {
			   authorName = addressObj.name;
			   authorMail = addressObj.email;
		   } else {
			   authorName = "";
			   authorMail = "";
			   logError("Problem with addressparser: " + from);
		   }
		   
		   authorMail = html_sanitize(authorMail);
		   
		   mailObject.account = that;
		   mailObject.id = httpBody.id;
		   mailObject.deliveredTo = MyGAPIClient.getAllHeaderValues(headers, "Delivered-To"); // Used to determine any "send mail as" alternate emails etc.
		   mailObject.replyTo = MyGAPIClient.getHeaderValue(headers, "Reply-To"); // might have alternate reply to email
		   mailObject.messageId = MyGAPIClient.getHeaderValue(headers, "Message-ID"); // Used for replying
		   mailObject.threadId = httpBody.threadId;
		   mailObject.title = subject;
		   mailObject.summary = summary;
		   mailObject.issued = issued;
		   mailObject.authorName = authorName;
		   mailObject.authorMail = authorMail; 
		   
		   if (httpBody.labelIds) {
			   mailObject.labels = httpBody.labelIds;
		   } else {
			   mailObject.labels = [];
		   }
		   
		   if (httpBody.monitoredLabel) {
			   mailObject.monitoredLabel = httpBody.monitoredLabel;
		   } else {
			   // probably fetched via history so let's just tag the first monitoredlabel to it
			   mailObject.monitoredLabel = that.getFirstMonitoredLabel(httpBody.labelIds, monitoredLabels);
		   }
		   
		   mailObject.contributors = [];
		   
		   // init first conversation message, which is same as mailobject message
		   mailObject.messages = [];
		   var message = generateMessageFromHttpResponseMessage(mailObject, httpBody);
		   mailObject.messages.push(message);
		   
		   mailObjects.push(mailObject);
	   });
	   
	   mailObjects.forEach(function(mailObject) {
		   mailObject.sortMessages();
		   // Make sure last convesation date is synced with mailobject date/issue (issue doesn't have happen on extension load but it does upon detecting history changes)
		   var lastMessage = mailObject.messages.last();
		   if (lastMessage) {
			   mailObject.issued = lastMessage.date;
		   }
	   });
	   
	   return {mailObjects:mailObjects, totalMessagesThatWereGrouped:totalMessagesThatWereGrouped};
   }
   
   function fetchMessageIdsByLabels(monitoredLabels) {
	   console.log("fetchMessageIdsByLabels");

	   return new Promise(function(resolve, reject) {
		   var mygapiClient = getMyGAPIClient();

		   /*
		    	decided not to finish this code because usually sent emails are never unread! , but use this in the future if have to include sent emails in message history
		   		var monitoredLabelsAndSent = monitoredLabels.concat([GmailAPI.labels.SENT]);
		    	other notes...
		    	test conversation view disabled for sent emails
				that.unreadCount -= getMessagesResponse.fetchMessagesByLabelsResponse.oauthEmailAlreadyFoundInADifferentLabelFetch;
				if can't match threadid remove it because we don't want a loan sent email
				might have to sort sent email into messages list (not just append/prepend etc.)
		    */
		   
		   monitoredLabels.forEach(function(monitoredLabel) {
			   var path = GmailAPI.PATH + "messages?labelIds=" + GmailAPI.labels.UNREAD + "&maxResults=" + MAX_EMAILS_TO_FETCH;
			   if (monitoredLabel != SYSTEM_ALL_MAIL) {
				   path += "&labelIds=" + getGmailAPILabelId(monitoredLabel);
			   }

			   // if a primary category (primary, promots etc.) or important+inbox then let's ensure they are also labeled "inbox"
			   if (isMainCategory(monitoredLabel) || monitoredLabel == SYSTEM_IMPORTANT_IN_INBOX) {
				   path += "&labelIds=" + GmailAPI.labels.INBOX;
			   }

			   var httpRequest = mygapiClient.request({
				   path: path,
				   method: "GET"
			   });
			   mygapiClient.HttpBatch.add(httpRequest);
		   });

		   mygapiClient.HttpBatch.execute({oauthRequest:oAuthForEmails, email:mailAddress}).then(function(batchResponse) {
			   // tag monitored label to httpbodies
			   batchResponse.httpBodies.forEach(function(httpBody, httpBodyIndex) {
				   httpBody.monitoredLabel = monitoredLabels[httpBodyIndex];
			   });
			   resolve({httpBodies:batchResponse.httpBodies});
		   }).catch(function(errorResponse) {
			   reject(errorResponse);
		   });
	   });
   }

   function fetchMessagesByIds(messages) {
	   console.log("fetchMessagesByIds", messages);
	   
	   return new Promise(function(resolve, reject) {
		   var mygapiClient = getMyGAPIClient();
		   
		   messages.forEach(function(message) {
			   console.log("messageid: " + message.id);
			   
			   var httpRequest = mygapiClient.request({
				   path: GmailAPI.PATH + "messages/" + message.id,
				   method: "GET"
			   });
			   mygapiClient.HttpBatch.add(httpRequest);
		   });

		   mygapiClient.HttpBatch.execute({oauthRequest:oAuthForEmails, email:mailAddress}).then(function(batchResponse) {
			   // tag monitored label to httpbodies
			   // tag unsnoozed flags to httpbodies
			   batchResponse.httpBodies.forEach(function(httpBody, httpBodyIndex) {
				   httpBody.monitoredLabel = messages[httpBodyIndex].monitoredLabel;
				   httpBody.unSnoozed = messages[httpBodyIndex].unSnoozed;
			   });
			   
			   resolve({httpBodies:batchResponse.httpBodies});
		   }).catch(function(errorResponse) {
			   reject(errorResponse);
		   });
	   });
   }
   
   function processPart(part, message) {
	   if (part.mimeType == "text/plain") { // message/rfc822
		   message.textContent += decodeBase64UrlSafe(part.body.data);
		   
		   var MAX_CONTENT_LENGTH = 1000000;
		   
		   if (message.textContent && message.textContent.length > MAX_CONTENT_LENGTH) {
			   message.textContent = message.textContent.substr(0, MAX_CONTENT_LENGTH) + " ... (truncated by extension)";
		   }
		   
		   if (message.content == null) {
			   message.content = "";
		   }
	   } else if (part.mimeType == "text/html") {
		   if (part.body.data) {
			   message.content = decodeBase64UrlSafe(part.body.data);
			   
			   // Must keep content-id reference for inline images, so let's fool sanitizer to by prefixing it with "http://"
			   message.content = message.content.replace(/src=\"cid:/g, "src=\"" + FOOL_SANITIZER_CONTENT_ID_PREFIX);
			   message.content = message.content.replace(/src=\'cid:/g, "src=\'" + FOOL_SANITIZER_CONTENT_ID_PREFIX);
			   
			   message.content = html_sanitize(message.content, allowAllUrls, rewriteIds);
			   // just remove img altogether
			   if (message.content) {
				   message.content = message.content.replace(/<img /g, "<imghidden ");
				   message.content = message.content.replace(/\/img>/g, "/imghidden>");
			   }
		   }
	   } else if (part.parts && part.parts.length) { // do this after searching text and html, part.mimeType == "multipart/mixed" || part.mimeType == "multipart/alternative" || part.mimeType == "multipart/related" || part.mimeType == "multipart/relative" || part.mimeType == "multipart/parallel" || part.mimeType == "multipart/multipart" || part.mimeType == "multipart/report" || part.mimeType == "multipart/signed"
		   part.parts.forEach(function(part) {
			   processPart(part, message);
		   });
	   } else if (part.mimeType && part.mimeType.indexOf("image/") != -1) { // this one appears with parent mimetype "multipart/multipart" like cra emails
		   message.files.push(part);
	   } else if (part.filename) {
		   message.files.push(part);
	   } else if (part.mimeType == "message/delivery-status" || part.mimeType == "message/rfc822") { // mail server errors: refer to email from my user: Yu ENOKIBORI
		   // ignore these because typically the text/plain also exists
	   //} else if (part.mimeType == "text/watch-html") {
		   // ignore this for Apple Watch display
	   } else if (part.mimeType == "application/octet-stream") {
		   if (!message.content) {
			   message.content = "";
		   }
		   message.content += " [File attached] But this extension could not process it. Use <a href='https://jasonsavard.com/forum/categories/checker-plus-for-gmail-feedback?ref=unknownMimeType'>Checker Plus forum</a> to help me with this issue.";
	   } else {
		   if (!message.textContent && !message.content) {
			   logError("must add logic for mimetype: " + part.mimeType, part);
			   message.content = "Error unknown mimetype: " + part.mimeType + " <br><br>Search or post this bug on the <a href='https://jasonsavard.com/forum/categories/checker-plus-for-gmail-feedback?ref=unknownMimeType'>Checker Plus forum</a>";
		   } else {
			   if (part.mimeType != "text/x-watch-html") { // ignore x-watch
				   logError("must add logic for mimetype (but found other content): " + part.mimeType, part);
			   }
		   }
	   }
   }
   
   function generateMessageFromHttpResponseMessage(mail, httpResponseMessage) {
	   var headers = httpResponseMessage.payload.headers;
	   
	   var message = {};
	   
	   message.id = httpResponseMessage.id;
	   message.labels = httpResponseMessage.labelIds;
	   
	   message.to = [];
	   message.cc = [];
	   message.bcc = [];
	   
	   message.files = [];
	   
	   message.date = getDateFromHttpResponseMessage(httpResponseMessage);

	   var subject = MyGAPIClient.getHeaderValue(headers, "Subject");
	   
	   var from = MyGAPIClient.getHeaderValue(headers, "From");
	   message.from = addressparser(from).first();
	   
	   var to = MyGAPIClient.getHeaderValue(headers, "To");
	   message.to = addressparser(to);
	   var cc = MyGAPIClient.getHeaderValue(headers, "CC");
	   message.cc = addressparser(cc);
	   var bcc = MyGAPIClient.getHeaderValue(headers, "BCC");
	   message.bcc = addressparser(bcc);
	   
	   message.textContent = "";

	   processPart(httpResponseMessage.payload, message);
	   
	   // if no text content then use the html content
	   if (!message.textContent) {
		   if (message.content) {
			   message.textContent = message.content.htmlToText();
		   }
		   if (!message.textContent) {
			   message.textContent = "";
		   }
	   }
	   
	   // if no html content then use the text content
	   if (!message.content) {
		   if (message.textContent) {
			   message.content = convertPlainTextToInnerHtml(message.textContent);
			   message.content = html_sanitize(message.content, allowAllUrls, rewriteIds);
		   }
		   if (!message.content) {
			   message.content = "";
		   }
	   }
	   
	   message.textContent = filterEmailBody(subject, message.textContent);
	   message.textContent = html_sanitize(message.textContent);
	   
	   // must mimic everything here for the auto-detect method and vica versa
	   message.mail = mail;

	   return message;
   }
   
   function getDateFromHttpResponseMessage(httpResponseMessage) {
	   var headers = httpResponseMessage.payload.headers;

	   /*
	   var date = MyGAPIClient.getHeaderValue(headers, "Date");
	   if (date) {
		   date = new Date(date);
		   if (isNaN(date.getTime())) {
			   console.error("could not parse date: " + date);
			   date = new Date();
		   }
	   } else {
		   console.error("date header not found");
		   date = new Date();
	   }
	   return date;
	   */
	   
	   var date = new Date(parseInt(httpResponseMessage.internalDate));
	   return date;
   }
   
   async function fetchUnreadCount(labelIds, fetchWithInboxCount) {
	   console.log("fetchUnreadCount");
	   
        var mygapiClient = getMyGAPIClient();
        
        labelIds.forEach(function(labelId) {
            var path = null;
            // exclude primary because we need to count primary+inbox labelled emails (not just primary) we fetch that unread count using the resultSizeEstimate later in the code
            //if ((labelId == SYSTEM_INBOX && that.getSetting("openLinksToInboxByGmail")) || labelId == SYSTEM_PRIMARY) {
            if (isMainCategory(labelId)) {
                if (fetchWithInboxCount) {
                    if (conversationView) {
                        path = GmailAPI.PATH + "threads";
                    } else {
                        path = GmailAPI.PATH + "messages";
                    }
                    path += "?labelIds=" + GmailAPI.labels.UNREAD + "&labelIds=" + GmailAPI.labels.INBOX + "&labelIds=" + getGmailAPILabelId(labelId) + "&maxResults=1";
                } else {
                    // no path here because we will fetch the resultSizeEstimate size later
                }
            } else {
                path = GmailAPI.PATH + "labels/";
                if (labelId == SYSTEM_ALL_MAIL) {
                    path += GmailAPI.labels.UNREAD;
                } else {
                    path += getGmailAPILabelId(labelId);
                }
            }
            
            if (path) {
                var httpRequest = mygapiClient.request({
                    method: "GET",
                    path: path
                });
                mygapiClient.HttpBatch.add(httpRequest);
            }
        });

        const batchResponse = await mygapiClient.HttpBatch.execute({oauthRequest:oAuthForEmails, email:mailAddress});
        let unreadCount = 0;
        batchResponse.httpBodies.forEach(function(httpBody) {
            // when using messages.list API
            if (typeof httpBody.resultSizeEstimate !== "undefined") {
                unreadCount += httpBody.resultSizeEstimate;
            } else {
                if (conversationView) {
                    unreadCount += httpBody.threadsUnread;
                } else {
                    unreadCount += httpBody.messagesUnread;
                }
            }
        });
        return unreadCount;
   }
   
   function getHistoryForFirstTime() {
	   return new Promise(function(resolve, reject) {
		   oAuthForEmails.send({userEmail:mailAddress, url: GmailAPI.URL + "profile", noCache:true}).then(response => {
			   resolve(response.data);
		   }).catch(error => {
			   reject(error);
		   });
	   });
   }
   
   function getHistory(params) {
	   console.log("getHistory");
	   return new Promise((resolve, reject) => {
		   // Fetch the latest historyid by passing the history id of the last message. I'm only passing the labelid=inbox to minimize response data
		   var data = {labelId:GmailAPI.labels.UNREAD, startHistoryId:params.historyId, maxResults:MAX_EMAILS_HISTORIES, fields:"history(labelsAdded,labelsRemoved,messagesAdded,messagesDeleted),historyId,nextPageToken"};
		   if (params.nextPageToken) {
			   data.pageToken = params.nextPageToken;
		   }
		   var sendParams = {userEmail:mailAddress, url: GmailAPI.URL + "history", data:data, noCache:true};
		   if (!params.labelId || params.labelId == SYSTEM_ALL_MAIL) {
			   // do not send any label id params
		   } else {
			   sendParams.data.labelId = params.labelId;
		   }
		   oAuthForEmails.send(sendParams).then(response => {
			   data = response.data;
			   if (params.labelId) {
				   data.historyLabelId = params.labelId;
			   }
			   resolve(data);
		   }).catch(error => {
			   if (error.code == 404) {
				   error.jreason = JError.HISTORY_INVALID_OR_OUT_OF_DATE;
			   }
			   reject(error);
		   });
	   });
   }
   
   this.fetchAttachment = function(params) {
	   console.log("fetchAttachment");
	   return new Promise(function(resolve, reject) {
		   if (!params.noSizeLimit && params.size > FETCH_ATTACHMENT_MAX_SIZE) {
			   reject("Size too large");
			   return;
		   }
		   
		   var sendParams = {userEmail:mailAddress, url: GmailAPI.URL + "messages/" + params.messageId + "/attachments/" + params.attachmentId};
		   oAuthForEmails.send(sendParams).then(historyResponse => {
			   var fetchAttachmentResponse = historyResponse.data;
			   // Because API returns base64 url safe strings
			   fetchAttachmentResponse.data = replaceBase64UrlSafeCharacters(fetchAttachmentResponse.data);
			   resolve(fetchAttachmentResponse);
		   }).catch(error => {
			   reject(error);
		   });
	   });
   }

   async function executeGmailHttpAction(params) {
        var ajaxParams = {
            //url: that.getMailUrl({useBasicGmailUrl:true}) + Math.ceil(1000000 * Math.random()) + "/",
            //url: "https://mail.google.com/mail/u/0/?ui=2&ik=123&rid=mail%3Ao.9e1a.96.0&at=AF6bupN0CDphKYxXh0oklUzlASavdgE1ng&view=up&act=rd&vrd=1&_reqid=29052471&pcd=1&mb=0&rt=j&search=inbox",
            //method: "POST"
        }
        
        var COMMON_PARAMS = "t=" + params.mail.id + "&at=" + gmailAT + "&";
        //var COMMON_PARAMS = "?ui=2&pcd=1&mb=0&rt=j&search=inbox&vrd=1&at=" + gmailAT + "&";
        var ACT_PARAM_NAME = "act=";

        var urlParams = COMMON_PARAMS + ACT_PARAM_NAME;

        if (params.action == MailAction.MARK_AS_READ) {
            urlParams += "rd";
            //ajaxParams.data = {at:gmailAT, t:params.mail.id, tact:"rd", nvp_tbu_go:"Go", bact:""};
            //ajaxParams.data = {t:params.mail.id};
            //ajaxParams.data = {t:"123"};
        } else if (params.action == MailAction.MARK_AS_UNREAD) {
            urlParams += "ur";
            //ajaxParams.data = {at:gmailAT, t:params.mail.id, tact:"ur", nvp_tbu_go:"Go", bact:""};
        } else if (params.action == MailAction.DELETE) {
            urlParams += "tr";
            //ajaxParams.data = {at:gmailAT, t:params.mail.id, nvp_a_tr:"Delete", tact:"", bact:""};
        } else if (params.action == MailAction.ARCHIVE) {
            urlParams += "rc_" + encodeURIComponent("^i");
            //ajaxParams.url += COMMON_PARAMS + ACT_PARAM_NAME + "arch";
            //ajaxParams.data = {at:gmailAT, t:params.mail.id, nvp_a_arch:"Archive", tact:"", bact:""};
        } else if (params.action == MailAction.MARK_AS_SPAM) {
            urlParams += "sp";
            //ajaxParams.data = {at:gmailAT, t:params.mail.id, nvp_a_sp:"Report Spam", tact:"", bact:""};
        } else if (params.action == MailAction.APPLY_LABEL) {
            urlParams += "ac_" + encodeURIComponent(params.label);
        } else if (params.action == MailAction.REMOVE_LABEL) {
            if (params.label == SYSTEM_INBOX) {
                params.action = MailAction.ARCHIVE;
                return executeGmailHttpAction(params);
            } else {
                urlParams += "rc_" + encodeURIComponent(params.label);
            }
        } else if (params.action == MailAction.UNTRASH) {
            //ajaxParams.url += COMMON_PARAMS + "s=t&nvp_a_ib=Move to Inbox"; // nvp_a_ib is required but could be set to any value apparently
            //ajaxParams.url += COMMON_PARAMS + ACT_PARAM_NAME + "ib"; // nvp_a_ib is required but could be set to any value apparently
            //https://mail.google.com/mail/u/0/?ui=2&ik=b3dba55262&rid=mail%3Amti.9e1a.216.0&at=AF6bupN0CDphKYxXh0oklUzlASavdgE1ng&view=up&act=ib&_reqid=52852471&pcd=1&mb=0&rt=j&search=trash
            urlParams += "ib&pcd=1&mb=0&rt=j&search=trash&ui=2";
            ajaxParams.method = "POST";
            ajaxParams.data = {t:params.mail.id};
        } else if (params.action == MailAction.STAR) {
            //if (params.mail.labels.first() == SYSTEM_INBOX) { //inbox usually
            urlParams += "st";
            //} else {
                //ajaxParams.url += COMMON_PARAMS + "tact=st&nvp_tbu_go=Go&s=a";
            //}
            //ajaxParams.data = {at:gmailAT, t:params.mail.id, nvp_tbu_go:"Go", tact:"st", bact:""};
            params.mail.labels.push(SYSTEM_STARRED);
        } else if (params.action == MailAction.REMOVE_STAR) {
            urlParams += "xst";
            //ajaxParams.url += COMMON_PARAMS + "tact=xst&nvp_tbu_go=Go&s=a";
            //ajaxParams.data = {at:gmailAT, t:params.mail.id, nvp_tbu_go:"Go", tact:"xst", bact:""};
            var index = params.mail.labels.indexOf(SYSTEM_STARRED);
            if (index != -1) {
                params.mail.labels.splice(index, 1);
            }
        } else if (params.action == MailAction.REPLY) {
            urlParams += "sm&ui=2&cmml=" + params.message.length + "&pcd=1&mb=0&rt=c&search=inbox";

            function appendLine(str) {
                data += str + "\n";
            }

            var replyObj = await params.mail.generateReplyObject(params);

            ajaxParams.url = that.getMailUrl({useBasicGmailUrl:true}) + Math.ceil(1000000 * Math.random()) + "/";
            ajaxParams.method = "POST";
            if (params.replyAllFlag) {
                var data = "";
                
                var boundary = "----WebKitFormBoundarythAbRn0cGJ9FBoKg";
                
                appendLine("--" + boundary);
                appendLine("Content-Disposition: form-data; name=\"redir\"");
                appendLine("");
                appendLine("?th=" + params.mail.id + "&v=c&s=l");
                
                appendLine("--" + boundary);
                appendLine("Content-Disposition: form-data; name=\"at\"");
                appendLine("");
                appendLine(gmailAT);
                
                appendLine("--" + boundary);
                appendLine("Content-Disposition: form-data; name=\"to\"");
                appendLine("");
                
                var toStr = "";
                if (replyObj) {
                    replyObj.tos.forEach(function(to, index) {
                        if (index != 0) {
                            toStr += ", ";
                        }
                        toStr += convertAddress(to, true);
                    });
                } else {
                    toStr = convertAddress(params.to, true);
                }
                
                appendLine(toStr);
                
                appendLine("--" + boundary);
                appendLine("Content-Disposition: form-data; name=\"cc\"");
                appendLine("");
                
                var ccStr = "";
                if (replyObj && replyObj.ccs && replyObj.ccs.length) {
                    replyObj.ccs.forEach(function(cc, index) {
                        if (index != 0) {
                            ccStr += ", ";
                        }
                        ccStr += convertAddress(cc, true);
                    });
                }
                
                appendLine(ccStr);

                appendLine("--" + boundary);
                appendLine("Content-Disposition: form-data; name=\"bcc\"");
                appendLine("");
                appendLine("");

                appendLine("--" + boundary);
                appendLine("Content-Disposition: form-data; name=\"file0\"; filename=\"\"");
                appendLine("Content-Type: application/octet-stream");
                appendLine("");
                appendLine("");

                appendLine("--" + boundary);
                appendLine("Content-Disposition: form-data; name=\"subject\"");
                appendLine("");
                appendLine(params.mail.title);
                
                appendLine("--" + boundary);
                appendLine("Content-Disposition: form-data; name=\"body\"");
                appendLine("");
                appendLine(params.message);
                appendLine("");
                appendLine("> " + params.mail.getLastMessageText());

                appendLine("--" + boundary);
                appendLine("Content-Disposition: form-data; name=\"nvp_bu_send\"");
                appendLine("");
                appendLine("Send");

                appendLine("--" + boundary + "--");
                

                ajaxParams.contentType = "multipart/form-data; boundary=" + boundary;
                ajaxParams.url += "?fv=b&cs=c&pv=cv&th=" + params.mail.id + "&rm=" + params.mail.id + "&cpt=r&v=b&s=l";
                ajaxParams.processData = false;
                ajaxParams.data = data;
            } else {
                // when replying to emails with no inbox label ie. just Apps label, then we need to add s=l and also encoded s=l insie last param redir= 
                ajaxParams.url += "?" + COMMON_PARAMS + "v=b&qrt=n&pv=cv&s=l&fv=cv&cs=qfnq&rm=" + params.mail.id + "&th=" + params.mail.id + "&qrr=" + "o" + "&body=" + encodeURIComponent(params.message) + "&nvp_bu_send=Send&haot=qt&redir=" + encodeURIComponent("?v=c&s=l");
            }
        } else {
            throw new Error("action not found: " + params.action);
        }
        
        if (!ajaxParams.url) {
            ajaxParams.url = that.getMailUrl({useStandardGmailUrl:true, urlParams:urlParams});
        }
        
        let response;
        try {
            response = await ajaxBasicHTMLGmail(ajaxParams);
        } catch (jqXHR) {
            var error = new Error(jqXHR.statusText);
            error.errorCode = jqXHR.status;
            error.jqXHR = jqXHR;
            throw error;
        }

        if (params.action == MailAction.REPLY) {
            console.log("reply response: ", response);
            if (response && (response.indexOf("#FAD163") != -1 || response.toLowerCase().indexOf("your message has been sent") != -1)) {
                return "success";
            } else {
                throw new Error("Send error: Could not confirm action");
            }
        } /* else {
            // if no alert found non-english platform this might fail
            // jun. 22 2015 seems it fails occasionally (used to blame it on session) but it returns response just not the alert message i think
            // example response: <td bgcolor="#FAD163" role="alert">&nbsp;&nbsp;&nbsp;<b>The conversation has been marked read.</b>&nbsp;&nbsp;&nbsp;</td>
            if (response && response.indexOf("No conversations selected.") == -1 && (response.indexOf("role=\"alert\"") != -1 || response.toLowerCase().indexOf("the conversation has been") != -1)) {
                resolve();
            } else {
                var error = "Error: Could not confirm action: " + params.action;
                logError(error);
                if (response) {
                    logError("not confirm action response: " + response.substr(0, 100));
                }
                reject(error);
            }
        }
        */
        
        if (params.action == MailAction.DELETE || params.action == MailAction.MARK_AS_READ || params.action == MailAction.ARCHIVE) {
            const gmailSettings = await params.mail.account.getSetting("gmailSettings");
            if (gmailSettings.conversationViewMode === false && await storage.firstTime("conversationViewWarningShown")) {
                openUrl("https://jasonsavard.com/wiki/Conversation_View_issue");
            }
        }
   }
   
   async function executeGmailAPIAction(params) {
        // save the quota by using messages vs threads depending on conversation view
        var requestPath;
        
        // is request path overridden here?
        if (params.requestPath) {
            requestPath = params.requestPath;
        } else {
            var gmailAPIaction = params.gmailAPIaction;
            // default action is modify
            if (!gmailAPIaction) {
                gmailAPIaction = "modify";
            }
            if (await params.mail.account.getSetting("conversationView")) {
                requestPath = "threads/" + params.mail.threadId + "/" + gmailAPIaction;
            } else {
                requestPath = "messages/" + params.mail.id + "/" + gmailAPIaction;
            }
        }
        
        bg.lastGmailAPIActionByExtension = new Date();
        
        var sendParams = {userEmail:mailAddress, type:"POST", url:GmailAPI.URL + requestPath, timeout:params.timeout};
        if (params.data) {
            sendParams.data = params.data;
        }

        const response = await oAuthForEmails.send(sendParams);
        console.log("execute history response", response.data);
        return response.data;
   }
   
   async function executeMailAction(params) {
	   console.log("in executeMailAction", params);
	   
        if (accountAddingMethod == "autoDetect") {

            await getGmailAT();
            try {
                const response = await executeGmailHttpAction(params);
                await that.getEmails();
                await bg.mailUpdate(params);
                return response;
            } catch (error) {
                showCouldNotCompleteActionNotification(error, true);
                console.error("executeMailAction: ", error);
                throw error;
            }
        } else { // oauth submit

            var promise;
            
            if (params.action == MailAction.MARK_AS_READ) {
                params.data = {removeLabelIds:[GmailAPI.labels.UNREAD]};
                promise = executeGmailAPIAction(params);
            } else if (params.action == MailAction.MARK_AS_UNREAD) {
                params.data = {addLabelIds:[GmailAPI.labels.UNREAD]};
                promise = executeGmailAPIAction(params);
            } else if (params.action == MailAction.DELETE) {
                params.gmailAPIaction = "trash";
                promise = executeGmailAPIAction(params);
            } else if (params.action == MailAction.UNTRASH) {
                params.gmailAPIaction = "untrash";
                await executeGmailAPIAction(params);
                // must also reapply "inbox" label
                params.action = MailAction.APPLY_LABEL;
                delete params.gmailAPIaction;
                params.data = {addLabelIds:[GmailAPI.labels.INBOX]};
                return executeGmailAPIAction(params);
            } else if (params.action == MailAction.ARCHIVE) {
                params.data = {removeLabelIds:[GmailAPI.labels.INBOX]};
                promise = executeGmailAPIAction(params);
            } else if (params.action == MailAction.MARK_AS_SPAM) {
                params.data = {addLabelIds:[GmailAPI.labels.SPAM]};
                promise = executeGmailAPIAction(params);
            } else if (params.action == MailAction.APPLY_LABEL) {
                params.data = {addLabelIds:[params.label]};
                const executeResponseParams = await executeGmailAPIAction(params);
                params.mail.labels.push(params.label);
                promise = Promise.resolve(executeResponseParams);
            } else if (params.action == MailAction.REMOVE_LABEL) {
                params.data = {removeLabelIds:[params.label]};
                const executeResponseParams = await executeGmailAPIAction(params);
                var foundIndex = params.mail.labels.indexOf(params.label);
                params.mail.labels.splice(foundIndex, 1);
                promise = Promise.resolve(executeResponseParams);
            } else if (params.action == MailAction.STAR) {
                params.data = {addLabelIds:[GmailAPI.labels.STARRED]};
                await executeGmailAPIAction(params);
                params.mail.labels.push(GmailAPI.labels.STARRED);
                promise = Promise.resolve();
            } else if (params.action == MailAction.REMOVE_STAR) {

                // remove before complete to fix this bug https://jasonsavard.com/forum/discussion/5266/small-bug-unstar-seems-to-fail-if-you-are-too-quick-to-open-the-mail
                var index = params.mail.labels.indexOf(GmailAPI.labels.STARRED);
                if (index != -1) {
                    params.mail.labels.splice(index, 1);
                }

                params.data = {removeLabelIds:[GmailAPI.labels.STARRED]};
                await executeGmailAPIAction(params);
                promise = Promise.resolve();
            } else if (params.action == MailAction.SEND_EMAIL) {
                params = await generateExecuteGmailAPIActionParams(params);
                params.timeout = minutes(2);
                promise = executeGmailAPIAction(params);
            } else if (params.action == MailAction.REPLY) {
                params = await generateExecuteGmailAPIActionParams(params);
                params.timeout = minutes(2);
                promise = executeGmailAPIAction(params);
            } else {
                var error = "action not found: " + params.action;
                logError(error);
                promise = Promise.reject(error);
            }
            
            try {
                const response = await promise;
                // let's save some quota and not call .getEmails
                var removedEmail;
                
                if (params.action == MailAction.MARK_AS_READ || params.action == MailAction.DELETE || params.action == MailAction.ARCHIVE || params.action == MailAction.MARK_AS_SPAM || (params.action == MailAction.REMOVE_LABEL && params.mail && params.mail.monitoredLabel == params.label)) {
                    if (that.removeMail(params.mail.id)) {
                        removedEmail = true;
                        --that.unreadCount; // account specific (not the global bg.unreadCount)
                        console.log("removemail unreadcount: " + that.unreadCount);
                    }
                }
                
                if (removedEmail && !params.instantlyUpdatedCount) {
                    // use bg.unreadCount because that is the global unreadcount (as opposed to just unreadCount which is local to this mailAccount)
                    var newBadgeCount = lsNumber("unreadCount") - 1;
                    console.log("updatebadge: " + newBadgeCount);
                    updateBadge(newBadgeCount);
                }
                
                return response;
            } catch (error) {
                showCouldNotCompleteActionNotification(error.toString());
                console.error("executeGmailAPIAction: " + error);
                throw error;
            }
        }
   }
   
   this.testGmailAT = function(force) {
	   return getGmailAT(force);
   }
   
   // acts as a singleton so that it can handle multiple calls
   function getGmailAT(force) {
	   if (!gmailATProcessing || force) {
		   gmailATProcessing = true;
		   getGmailAtPromise = new Promise((resolve, reject) => {
			   
			   // every 5 minutes
			   if (!gmailAT || lastGmailATFetch.diffInMinutes() <= -5 || force) {
				   
				   fetchGmailAT2().then(response => {
					   gmailAT = response;
					   lastGmailATFetch = new Date();
					   console.log("get at: " + gmailAT);
					   resolve(response);
				   }).catch(error => {
					   logError(error);
					   fetchGmailAT1().then(function(response) {
						   gmailAT = response;
						   lastGmailATFetch = new Date();
						   console.log("get at2: " + gmailAT);
						   resolve(response);
					   }).catch(error => {
						   logError(error);
						   reject(error);
					   });
				   });
				   
			   } else {
				   resolve(gmailAT);
			   }
			   
		   });
	        
		   getGmailAtPromise.then(() => {
			   gmailATProcessing = false;
		   }).catch(error => {
			   gmailATProcessing = false;
		   });
	   }
	   return getGmailAtPromise;
   }

   function fetchGmailAT1() {
	   return new Promise((resolve, reject) => {
           const ajaxParams = {
                url: that.getMailUrl({useBasicGmailUrl:true}) + Math.ceil(1000000 * Math.random())
           }
		   ajaxBasicHTMLGmail(ajaxParams).then(data => {
			   // must keep the \b because some emails had content like ... format=123  and the at=123 was matched!
			   var matches = data.match(/\bat\=([^\"\&]*)/); //  new one:   /at\=([^\"\&]*)/     old one: /\at=([^"&]+)/
			   if (matches && matches.length) { // sample at: AF6bupND7QvFVgjkbg_PAWf7jUnB-zQFTQ   xF6bupMdRlq_g8bP0qwnUMLHR3_PwMA7PA  xF6bupMQ3nNhcKWmba7nVIHX8Am4WaH_qQ  
				   var foundAT;
				   for (var a=1; a<matches.length; a++) {
					   // if between 20 and 50 characters then say it's valid and don't match any html like ... 0</font></span></a></td><td nowrap>Apr OR 0%3C/font%3E%3C/span%3E%3C/a%3E%3C/td%3E%3Ctd%20nowrap%3EApr
					   if (matches[a].length >= 20 && matches[a].length <= 50 && matches[a].indexOf("<") == -1 && matches[a].indexOf(">") == -1 && matches[a].indexOf("/") == -1 && matches[a].indexOf(" ") == -1) {
						   foundAT = matches[a];
						   break;
					   }
				   }
				   if (foundAT) {
					   resolve(foundAT);
				   } else {
					   reject("gmail at error, no valid AT found");
				   }
			   } else {
				   reject("gmail at error parsing");
			   }
		   }, jqXHR => {
			   reject("gmail AT error: " + jqXHR.status);
		   });
	   });
   }

   function fetchGmailAT2() {
	   return new Promise((resolve, reject) => {
		   var url = that.getMailUrl({useStandardGmailUrl:true});
		   
		   ajax(url).then(data => {
			   var tmp = /GM_ACTION_TOKEN\=\"([^\"]*)\"/.exec(data);
			   if (tmp && tmp.length >= 2) {
				   resolve(tmp[1]);
			   } else {
				   reject("gmail at error2 parsing");
			   }
		   }, jqXHR => {
		       reject("gmail at error2: " + jqXHR.status);
		   });
	   });
   }
   
   function fetchGmailIdKey() {
		return new Promise((resolve, reject) => {
			var url = that.getMailUrl({useStandardGmailUrl:true});
			
			ajax(url).then(data => {
				var tmp = /GM_ID_KEY\=\"([^\"]*)\"/.exec(data);
				if (tmp && tmp.length >= 2) {
					resolve(tmp[1]);
				} else {
					reject("gmail id key error parsing");
				}
			}, jqXHR => {
				reject("gmail id key error: " + jqXHR.status);
			});
		});
	}

   async function generateExecuteGmailAPIActionParams(params) {
	   var account;
	   if (params.account) {
		   account = params.account;
	   } else if (params.mail) {
		   account = params.mail.account;
	   } else {
		   account = that;
	   }
	   
	   var replyObj;
	   
	   if (params.action == MailAction.REPLY) {
		   replyObj = await params.mail.generateReplyObject(params);
		   console.log("replyobj in generaetexec", replyObj);
	   }

	   var mimeMessage = "";
	   
	   mimeMessage += "MIME-Version: 1.0" + "\n";
	   
	   if (params.action == MailAction.REPLY) {
		   mimeMessage += "In-Reply-To: " + params.mail.messageId + "\n";
		   mimeMessage += "References: " + params.mail.messageId + "\n";
	   }
	   
	   var fromObj = {};
	   
	   var fromEmail;
	   // if from found might have been from a "send mail as" email address
	   if (replyObj && replyObj.from) {
		   fromObj = replyObj.from;
	   } else {
		   fromObj.email = that.getAddress();
	   }
	   
	   if (account) {
		   var profileInfo = await account.getSetting("profileInfo");
		   if (profileInfo) {
			   fromObj.name = profileInfo.displayName;
		   }
	   }
	   
	   // test
	   //fromObj.name = "hello - dude";
	   //fromObj.email = "richiefarret@gmail.com";
	   
	   mimeMessage += "From: " + convertAddress(fromObj) + "\n";
	   
	   var tos = [];
	   if (replyObj) {
		   tos = replyObj.tos;
	   } else if (params.tos) {
		   tos = params.tos;
	   } else {
		   tos = [params.to];
	   }
	   
	   var toStr = "";
	   tos.forEach(function(to, index) {
		   if (index != 0) {
			   toStr += ", ";
		   }
		   toStr += convertAddress(to);
	   });
	   
	   //toStr = convertAddress({name:"Lord, Elgin", email:"richiefarret@gmail.com"});
	   console.info("to: " + toStr);
	   mimeMessage += "To: " + toStr + "\n";
	   //mimeMessage += 'To: Lord Melissa <richiefarret@gmail.com>' + '\n';

	   var ccs = [];
	   if (replyObj && replyObj.ccs && replyObj.ccs.length) {
		   ccs = replyObj.ccs;
	   } else if (params.ccs) {
		   ccs = params.ccs;
	   } else if (params.cc) {
		   ccs = [params.cc];
	   }

	   if (ccs.length) {
		   var ccStr = "";
		   ccs.forEach(function(cc, index) {
			   if (index != 0) {
				   ccStr += ", ";
			   }
			   ccStr += convertAddress(cc);
		   });
		   mimeMessage += "Cc: " + ccStr + "\n";
	   }

	   var subject;
	   if (params.action == MailAction.REPLY) {
		   subject = params.mail.title;
	   } else {
		   subject = params.subject;
	   }
	   
	   //mimeMessage += "Subject: " + subject + "\n";
	   //mimeMessage += "Content-type: text/html; charset=UTF-8" + "\n";
	   //mimeMessage += "Content-Transfer-Encoding: 8bit" + "\n";
	   //subject = "=?iso-8859-1?Q?=D0=9D=D1=8B=D0=BA =D0=B0=D0=BD =D0=BC=D1=8E=D0=BD=D0=B4=D0=B9 =D0=BA=D0=BE==D0=BD=D0=B2=D1=8B=D0=BD=D1=91=D1=80=D1=8B";
	   //subject = "=?UTF-8?B?PT91dGYtOD9CP1IyeGxaWG9nUTAxVElDMGcw?=";
	   //subject = "=?UTF-8?Q?a=C3=A9riennes?=";
	   // "Уже пожертвовали?"
	   if (subject) {
		   //subject = escapeToMime(subject, "quoted-printable", "UTF8");
		   subject = mimelib.mimeFunctions.encodeMimeWords(subject, "Q");
	   } else {
		   subject = "";
	   }
	   mimeMessage += "Subject: " + subject + "\r\n";
	   
	   /*
	    * Gmail API nuances
	    * I used to send text/plain and text/html but the Gmail API would overwrite/derive the text/plain part from the text/html with it's own logic
	    * Can't attachments + send text/plain together or else only text/plain would go through
	    */
	   
	   if (await account.getSetting("showSignature", "accountsShowSignature")) {
		   var sendAsData = await account.getSetting("sendAsData");
		   if (sendAsData) {
			   var signature;
			   sendAsData.sendAs.find(sendAs => {
				   if (sendAs.sendAsEmail == fromObj.email) {
					   signature = sendAs.signature;
					   return true;
				   }
			   });
			   
			   if (signature) {
				   if (!params.htmlMessage) {
				   		params.htmlMessage = convertPlainTextToInnerHtml(params.message);
				   }
				   params.htmlMessage += '<br><div class="gmail_signature" data-smartmail="gmail_signature">' + signature + '</div>'; 
			   }
		   }
	   }
	   
	   if (!params.message && !params.htmlMessage && !params.attachment) {
		   // send nothing!
	   } else if (params.message && !params.htmlMessage && !params.attachment) {
		   mimeMessage += "\n";
		   mimeMessage += params.message;
	   } else {
		   var BOUNDARY = "c4d5d00c4725d9ed0b3c8b";
		   mimeMessage += "Content-Type: multipart/related; boundary=" + BOUNDARY + "\n";
		   mimeMessage += "\n";
		   mimeMessage += "--" + BOUNDARY + "\n";
		   mimeMessage += "Content-Type: text/html;charset=utf-8" + "\n";
		   mimeMessage += "\n";
		   mimeMessage += params.htmlMessage;
		   mimeMessage += "\n\n";
		   
		   if (params.attachment) {
			   mimeMessage += "--" + BOUNDARY + "\n";
			   mimeMessage += "Content-Type: " + params.attachment.contentType + "\n";
			   mimeMessage += "Content-Disposition: attachment; filename=" + params.attachment.filename + "\n";
			   mimeMessage += "Content-Length: " + params.attachment.data.length + "\n";
			   if (params.attachment.duration) {
				   mimeMessage += "X-Content-Duration: " + params.attachment.duration + "\n";
			   }
			   mimeMessage += "Content-Transfer-Encoding: base64" + "\n";
			   mimeMessage += "\n";
			   mimeMessage += params.attachment.data;
		   }
		   mimeMessage += "--" + BOUNDARY + "--" + "\n";		   
	   }
	   
	   params.requestPath = "messages/send"; // ?uploadType=multipart 
	   
	   params.data = {};
	   params.data.raw = encodeBase64UrlSafe(mimeMessage);
	   if (params.action == MailAction.REPLY) {
		   params.data.threadId = params.mail.threadId;
	   }
	   return params;
   }
   
   this._openMailInBrowser = function(params) {
	   params = initUndefinedObject(params);
	   
	   params.useGmailUI = true;

	   var newURL = that.getMailUrl(params);
	   if (params.openInNewTab) {
		   openUrl(newURL, params);
	   } else if (params.openInBackground) {
		   chrome.tabs.create({url:newURL, active:false});
	   } else {
		   that.findOrOpenGmailTab(params);
	   }
   }

   // Opens the inbox
   this.openInbox = async function(params) {
	   console.log("openinbox");
	   params = initUndefinedObject(params);
	   
	   params.label = await that.getOpenLabel();
	   that._openMailInBrowser(params);
   }
   
   this.openLabel = function(label) {
	   that.findOrOpenGmailTab({label:label});
   }
   
   this.openSearch = function(searchStr, params) {
	   params = initUndefinedObject(params);
	   
	   params.label = "search";
	   params.searchStr = searchStr;
	   that.findOrOpenGmailTab(params);
   }
   
   this.openMessageById = function(params) {
	   if (!params.label) {
		   params.label = SYSTEM_ALL_MAIL;
	   }
	   
	   that.findOrOpenGmailTab(params);
   }
   
   function loadMailInGmailTab(params) {
	   return new Promise((resolve, reject) => {
		   // focus window
		   chrome.windows.update(params.tab.windowId, {focused:true}, function() {
			   // focus/update tab
			   var newURL = params.account.getMailUrl(params);
			   
			   // if same url then don't pass url parameter or else chrome will reload the tab
			   if (params.tab.url == newURL) {
				   chrome.tabs.update(params.tab.id, {active:true}, function() {
					   resolve();
				   });
			   } else {
				   chrome.tabs.update(params.tab.id, {active:true, url:newURL}, function() {
					   // patch for issue when your newly composing an email, it seems if you navigate away Gmail with change the url back #compose after this initial change, so we have to change it twice with a delay
					   if (params.tab.url.endsWith("#compose")) {
						   setTimeout(function() {
							   chrome.tabs.update(params.tab.id, {active:true, url:newURL}, function() {
								   resolve(); 
							   });
						   }, 3000);
					   } else {
						   resolve();
					   }
				   });
			   }
		   });
	   });
   }
   
   this.findOrOpenGmailTab = function(params) {
	   params.useGmailUI = true;
	   
	   var mailUrl = that.getMailUrl(params);

	   var multiAccountPath = "/mail(/ca)?/u/";
	   var firstMultiAccountPath = "/mail/u/0";
	   
	   // get all gmail windows
	   chrome.tabs.query({url:MAIL_DOMAIN_AND_PATH + "*"}, function(tabs) {
		   
		   var defaultMailURLTab;
		   var exactMailURLTab;

		   $.each(tabs, function(index, tab) {
			   // apparently a launching Gmail in Chrome application shortcut is windowType = "popup" ???		   
			   if (!tab.url.match(multiAccountPath)) {
				   // no account # appended so could be the default url /mail/ (ie. NOT /mail/u/0/ etc..
				   defaultMailURLTab = tab;
				   params.account = getAccountById(0);
			   } else if (tab.url.match(multiAccountPath + that.id)) {
				   exactMailURLTab = tab;
				   params.account = getAccountById(that.id);
				   return false;
			   }
		   });
		   
		   // if 1st account then look for default url just /mail/ and not /mail/u/0/
		   if (mailUrl.indexOf(firstMultiAccountPath) != -1 && defaultMailURLTab) {
			   params.tab = defaultMailURLTab;
			   loadMailInGmailTab(params);
		   } else if (exactMailURLTab) {
			   params.tab = exactMailURLTab;
			   loadMailInGmailTab(params);
		   } else {
			   if (params.noMatchingTabFunction) {
				   params.noMatchingTabFunction(mailUrl);
			   } else {
				   openUrl(mailUrl);
			   }
		   }
		   
	   });
	   
	   if (params.mail) {
		   params.mail.markAsRead().then(() => {
			   that.getEmails().then(() => {
				   bg.mailUpdate();
			   });
		   });
	   }
	   
   }

   // Fetches content of thread
   function fetchThread(params) {
	   var mail = params.mail;
	   
	   console.log("fetchthread: " + mail.title);
	   
	   //var url = that.getMailUrl({useBasicGmailUrl:true}).replace('http:', 'https:') + Math.ceil(1000000 * Math.random()) + "/?v=pt&th=" + mail.id;
	   var url = that.getMailUrl({useStandardGmailUrl:true, urlParams:"ui=2&view=pt&search=all&th=" + mail.id}); // th opens all thread msg only the last message i think,  dsqt=1 expand the text and removes quoted hidden text ... [Texte des messages précédents masqué]
	   
	   return ajax({
		   type: "GET",
		   timeout: REQUEST_TIMEOUT,
		   url: url
	   }).then(data => {
		   mail.messages = [];

		   // patch 101 to not load any images because apparently $("<img src='abc.gif'");  will load the image even if not displayed
		   
		   if (!params.forceDisplayImages) {
			   // just remove img altogether
			   if (data) {
				   data = data.replace(/<img /g, "<imghidden ");
				   data = data.replace(/\/img>/g, "/imghidden>");
			   }
		   }
		   
		   // need to add wrapper so that this jquery call workes "> table" ???
		   // patch for error "Code generation from strings disallowed for this context"
		   // the error would occur if I use jQuery's .append but not!!! if I initially set the content with $()
		   // now using safe parseHtmlToJQuery
		   var $responseWrapper = parseHtmlToJQuery(data);

		   // before google changed print page layout
		   var $tables = $responseWrapper.find("> table");
		   if ($tables.length) {
			   $tables = $tables.splice(0, 1);
		   } else {
			   // new layout
			   $tables = $responseWrapper.find(".maincontent .message");
		   }
		   
		   if ($tables.length && $tables.each) {
			   $tables.each(function(i) {
				   
				   var message = {};
				   message.to = [];
				   message.cc = [];
				   message.bcc = [];
				   
				   var $messageNode = $(this);
				   
				   // get from via by parsing this string:  John Poon <blah@hotmail.com>
				   var from = $messageNode.find("tr:eq(0)").find("td").first().text();
				   message.from = addressparser(from).first();

				   // get date from first line ex. Chloe De Smet Allègre via LinkedIn <member@linkedin.com>	 Sun, Jan 8, 2012 at 12:14 PM
				   message.dateStr = $.trim( $messageNode.find("tr:first").find("td").last().text() );
				   if (message.dateStr) {
					   message.date = parseGoogleDate(message.dateStr); // "Thu, Mar 8, 2012 at 12:58 AM";
				   }

				   // get to/CC
				   var $toCCHTML = $messageNode.find("tr:eq(1)").find("td");

				   var divs = $toCCHTML.find("div");							   
				   divs.each(function(i) {

					   // if 2 divs the first line is usually the reply-to line so ignore it
					   if (i == 0 && divs.length >= 2 && divs.eq(1).text().toLowerCase().indexOf("cc:") == -1) {
						   return true;
					   }
					   // remove to:, cc: etc...
					   var emails = $(this).text();
					   emails = emails.replace(/.*:/, "");
					   
					   if ($(this).text().toLowerCase().indexOf("bcc:") != -1) {
						   message.bcc = addressparser(emails);
					   } else if ($(this).text().toLowerCase().indexOf("to:") != -1) {
						   message.to = addressparser(emails);
					   } else if ($(this).text().toLowerCase().indexOf("cc:") != -1) {
						   message.cc = addressparser(emails);
					   } else {
						   // could not detect to or cc, could be in another language like chinese "收件者："
						   message.to = addressparser(emails);
					   }

				   });

				   var $gmailPrintContent = $messageNode.find("> tbody > tr:last-child table td");
				   
				   // remove some styling
				   $gmailPrintContent.find("div").first().removeAttr("style");
				   $gmailPrintContent.find("font").first().removeAttr("size");
				   
				   message.content = $gmailPrintContent.html();
				   
				   //message.textContent = htmlToText(message.content);
				   message.textContent = convertGmailPrintHtmlToText($gmailPrintContent);
				   
				   // cut the summary to lines before the [Quoted text hidden] (in any language)
				   var quotedTextHiddenArray = ["Quoted text hidden", "Texte des messages précédents masqué"];
				   for (var a=0; a<quotedTextHiddenArray.length; a++) {
					   var idx = message.textContent.indexOf("[" + quotedTextHiddenArray[a] + "]");
					   if (idx != -1) {
						   message.textContent = message.textContent.substring(0, idx);
						   break;
					   }
				   }
				   
				   message.textContent = filterEmailBody(mail.title, message.textContent);
				   
				   message.textContent = html_sanitize(message.textContent);
				   
				   message.mail = mail;
				   
				   mail.messages.push(message);
			   });
		   } else {
			   var message = {};
			   console.warn("Could not parse body from print page: ", $responseWrapper);
			   message.from = {name:mail.getName(), email:mail.authorMail}; 
			   message.content = $responseWrapper.html();
			   
			   // remove script tags to bypass content_security_policy
			   message.content = message.content.replaceAll("<script", "<div style='display:none'");
			   message.content = message.content.replaceAll("</script>", "</div>");
			   
			   message.textContent = convertGmailPrintHtmlToText($responseWrapper);
			   message.textContent = html_sanitize(mail.textContent);
			   mail.messages.push(message);
		   }
		   
		   return {mail:mail};			   
	   }, jqXHR => {
		   return Promise.reject(jqXHR.statusText);
	   });
   }
   
   this.getSetting = async function(attributeName, settingsName) {

	   // if no settingsname passed just use attribute
	   if (!settingsName) {
		   settingsName = attributeName;
	   }
	   
	   var emailSettings = await storage.get("emailSettings");
	   if (emailSettings) {
		   var accountEmailSettings = emailSettings[that.getAddress()];
		   if (accountEmailSettings) {
			   let accountEmailSetting = accountEmailSettings[attributeName];
			   if (accountEmailSetting != undefined) {
				   return accountEmailSetting;
			   }
		   }
	   }
	   
	   // getting here means nothing matched above
	   return storage.defaults[settingsName];
   }
   
   this.deleteSetting = function(key) {
	   return that.saveSetting(key, null);
   }
   
   this.saveSetting = async function(key, value) {
	   var emailSettings = await storage.get("emailSettings");
	   var accountEmailSettings;
	   if (!emailSettings) {
		   emailSettings = {}
	   }
	   accountEmailSettings = emailSettings[that.getAddress()];
	   if (!accountEmailSettings) {
		   // do this so that accountEmailSettings is references to emailSettings
		   emailSettings[that.getAddress()] = {};
		   accountEmailSettings = emailSettings[that.getAddress()];
	   }
	   
	   if (value == null) {
		   delete accountEmailSettings[key];
	   } else {
		   accountEmailSettings[key] = value;
	   }
	   return storage.set("emailSettings", emailSettings);
   }

   this.getSettingForLabel = async function(key, label, defaultObj) {
	   	var labelSettings = await that.getSetting(key);
	   	
		if (!labelSettings) {
			labelSettings = {};
		}

		var value;
		if (typeof labelSettings[label] == "undefined") {
			value = defaultObj;
		} else {
			value = labelSettings[label];
		}
		return value;
   }

   this.saveSettingForLabel = async function(key, label, value) {
		var labelSettings = await that.getSetting(key);
		if (!labelSettings) {
			labelSettings = {};
		}
		labelSettings[label] = value;
		return that.saveSetting(key, labelSettings);
   }
   
   this.isUsingGmailCategories = async function() {
		var gmailSettings = await that.getSetting("gmailSettings");
		return (gmailSettings.tabs && gmailSettings.tabs.length >= 2);
   }
   
   this.isMaybeUsingGmailCategories = async function() {
		var gmailSettings = await that.getSetting("gmailSettings");
		return gmailSettings.tabs == undefined || (gmailSettings.tabs && gmailSettings.tabs.length >= 2);
   }

   this.hasHiddenTabs = async function() {
		var gmailSettings = await that.getSetting("gmailSettings");
		return await that.isUsingGmailCategories() && (gmailSettings.tabs && gmailSettings.tabs.length < TOTAL_GMAIL_TABS); // 5 means ok because they are all shown
   }

   this.getMonitorLabels = async function() {
	   return await that.getSetting("monitorLabel", "monitorLabelsForGmailClassic");
   }
   
   this.getFirstMonitoredLabel = function(gmailAPILabelIds, monitoredLabels) {
	   for (var a=0; a<monitoredLabels.length; a++) {
		   for (var b=0; gmailAPILabelIds && b<gmailAPILabelIds.length; b++) {
			   if (getGmailAPILabelId(monitoredLabels[a]) == gmailAPILabelIds[b]) {
				   return monitoredLabels[a];
			   }
		   }
	   }
   }

   this.getOpenLabel = async function() {
	   return await that.getSetting("openLabel", "open_label");
  }

   // Retrieves unread count
   this.getUnreadCount = function () {
	   if (that.unreadCount < 0) {
		   that.unreadCount = 0;
	   }
	   return that.unreadCount;
   }
   
   this.getEmailDisplayName = async function() {
	   var alias = await that.getSetting("alias");
	   if (alias) {
		   return alias;
	   } else {
		   return that.getAddress();
	   }
   }

	this.getMailUrl = function (params) {
		params = initUndefinedObject(params);

		var mailUrl = MAIL_DOMAIN;

		if (that.id != null && !that.mustResync) {
			// This is a Google account with multiple sessions activated
			if (params.useBasicGmailUrl || (!params.useStandardGmailUrl && useBasicHTMLView)) {
				mailUrl = MAIL_DOMAIN_AND_PATH + "u/" + that.id + "/h/";
			} else {
				mailUrl += MAIL_PATH + "u/" + that.id + "/";
			}
		} else {
			// Standard one-session Gmail account
			console.trace("no account id");
			mailUrl += MAIL_PATH;
			if (params.useGmailUI && that.mustResync) {
				mailUrl = setUrlParam(mailUrl, "authuser", encodeURIComponent(that.getAddress()));
				// leave some grace time for user to sign in if they get they are prompted for password to sign into their gmail
				// stop previous timer (if any)
				clearTimeout(syncSignInIdTimer);
				if (that.resyncAttempts > 0) {
					syncSignInIdTimer = setTimeout(function() {
						that.resyncAttempts--;
						that.syncSignInId().then(async () => {
							await serializeOauthAccounts();
							that.mustResync = false;
						}).catch(errorResponse => {
							console.error("syncsignin error: " + errorResponse);
						});
					}, seconds(20));
				}
			}
		}

		if (params.useGmailUI) {
			var labelToUse;
			if (params.label != undefined) {
				labelToUse = params.label;
			} else {
				if (accountAddingMethod == "autoDetect") {
					labelToUse = params.mail.labels.first();
				} else {
					labelToUse = params.mail.monitoredLabel;
				}
			}

			if (labelToUse == SYSTEM_INBOX || labelToUse == SYSTEM_IMPORTANT || labelToUse == SYSTEM_IMPORTANT_IN_INBOX || labelToUse == SYSTEM_PRIMARY || labelToUse == SYSTEM_PURCHASES || labelToUse == SYSTEM_FINANCE || labelToUse == SYSTEM_SOCIAL || labelToUse == SYSTEM_PROMOTIONS || labelToUse == SYSTEM_UPDATES || labelToUse == SYSTEM_FORUMS) {
				labelToUse = "inbox"; // mbox changed to inbox
			} else if (labelToUse == SYSTEM_ALL_MAIL) {
				labelToUse = "all";
			} else if (labelToUse == SYSTEM_UNREAD) {
				labelToUse = "search/label%3Aunread";
			} else if (labelToUse == "search") {
				var searchStrFormatted = encodeURIComponent(params.searchStr);
				searchStrFormatted = searchStrFormatted.replace(/%20/g, "+");
				labelToUse = "search/" + searchStrFormatted;
			} else {
				if (params.mail) {
					labelToUse = params.mail.account.getLabelName(labelToUse);
				} else {
					labelToUse = that.getLabelName(labelToUse);
				}
				labelToUse = "label/" + labelToUse;
			}
			
			mailUrl += "#" + labelToUse;
			
			var messageId;
			var threadId;
			
			// passed directly
			if (params.messageId) {
				messageId = params.messageId;
			} else if (params.mail) { // passed via mail object
				messageId = params.mail.id;
				threadId = params.mail.threadId; // when using oauth we have threadId, use it because that's what Gmail uses when viewing emails (but not able to fetch it with auto-detect)
			}
			
			if (messageId) {
				if (useBasicHTMLView) {
					// only works with message id (not thread id)
					mailUrl = setUrlParam(mailUrl, "th", messageId);
					mailUrl = setUrlParam(mailUrl, "v", "c");
				} else if (conversationView && threadId) {
					mailUrl += "/" + threadId;
				} else {
					mailUrl += "/" + messageId;
				}
			}
		}

		if (params.atomFeed != undefined) {
			mailUrl += "feed/atom/" + params.atomFeed;
		}

		if (params.useStandardGmailUrl) {
			// bypass inbox redirection
			mailUrl = setUrlParam(mailUrl, "ibxr", "0");
		}

		if (params.urlParams) {
			if (mailUrl.indexOf("?") != -1) {
				mailUrl += "&"
			} else {
				mailUrl += "?";
			}
			mailUrl += params.urlParams;
		}

		return mailUrl;
	}

   // Returns the email address for the current account
   this.getAddress = function () {
	   if (mailAddress) {
		   return mailAddress;
	   } else {
		   return that.getMailUrl();
	   }
   }
   
   this.hasBeenIdentified = function() {
	   return mailAddress && mailAddress != MAIL_ADDRESS_UNKNOWN;
   }

   // Returns the mail array
   this.getMail = function () {
	   return mailArray;
   }
   
   this.getMailIndexById = function(id) {
	   for (var a=0; a<mailArray.length; a++) {
		   if (mailArray[a].id == id) {
			   return a;
		   }
	   }
	   return -1;
   }

   this.getMailById = function(id) {
	   var mailIndex = that.getMailIndexById(id);
	   if (mailIndex != -1) {
		   return mailArray[mailIndex];
	   }
   }
   
   this.removeMail = function(id) {
	   var mailIndex = that.getMailIndexById(id);
	   if (mailIndex != -1) {
		   return mailArray.splice(mailIndex, 1);
	   }
   }

   // Returns the newest mail
   this.getNewestMail = function () {
	   return newestMailArray.first();
   }

   // Returns the newest mail
   this.getAllNewestMail = function () {
	   return newestMailArray;
   }

   this.getUnSnoozedEmails = function () {
	   return unSnoozedEmails;
   }

   this.openCompose = async function(params) {

	   params = initUndefinedObject(params);
	   
	   params.account = that;
	   params.url = await generateComposeUrl(params);
	   
	   // generate a reply all regardless to store it for possible use later
	   params.generateReplyAll = true;
	   var urlReplyAll = await generateComposeUrl(params);
	   
	   localStorage["_composeUrl"] = params.url;
	   localStorage["_composeUrlReplyAll"] = urlReplyAll;
	   
	   console.log("open compose:", params);
	   
	   if (params.replyAction) {
		   // detect if more than 1 recipient and if so we show the reply all option to user
		   if ((params.replyAll.tos && params.replyAll.tos.length >= 2) || (params.replyAll.tos && params.replyAll.tos.length == 1 && params.replyAll.ccs >= 1) || (params.ccs && params.ccs.length >= 2)) {
			   params.showReplyAllOption = true;
			   console.log("show reply all");
		   }
	   }
	   
	   openTabOrPopup(params);
   }
   
   this.sendEmail = function(params) {
	   return new Promise((resolve, reject) => {
		   params.action = MailAction.SEND_EMAIL;
		   executeMailAction(params).then(response => {
			   resolve(response);
		   }).catch(error => {
			   reject(error);
		   })
	   });
   }
   
   this.ensureMailAddressIdentified = function() {
	   if (that.hasBeenIdentified()) {
		   return Promise.resolve();
	   } else {
		   return fetchFeed({ensureMailAddressIdentifiedFlag:true});
	   }
   }
   
   this.fetchGmailSettings = async function(params) {
	    params = initUndefinedObject(params);
	    await that.ensureMailAddressIdentified();
        let FETCH_INTERVAL_IN_DAYS = 1; // fetch every x days
        var lastFetchedGmailSettings = await that.getSetting("lastFetchedGmailSettings");
        if (lastFetchedGmailSettings && lastFetchedGmailSettings.diffInDays() > -FETCH_INTERVAL_IN_DAYS) { // !params.refresh && 
            return;
        } else {
            console.log("Fetch Gmail settings ...");
            const data = await ajax({
                type: "GET",
                dataType: "text",
                url: that.getMailUrl({useStandardGmailUrl:true}),
                timeout: seconds(7)
            });
            console.log("gmail settings", data);
            if (data) {
                // Detect conversation view off ["bx_vmb","1"]
                var conversationViewMode = true;
                if (data.indexOf("[\"bx_vmb\",\"1\"]") != -1) {
                    conversationViewMode = false;
                }
                
                // Detect Gmail category tabs ["sx_pits","^smartlabel_personal|^smartlabel_social"]
                var tabs = [];
                var tabsStr = data.match(/sx_pits\",\"(.*?)\"]/);
                if (tabsStr) {
                    tabsStr = tabsStr[1]
                    if (tabsStr.indexOf(AtomFeed.PRIMARY) != -1) {
                        tabs.push(SYSTEM_PRIMARY);
                    }
                    if (tabsStr.indexOf(AtomFeed.SOCIAL) != -1) {
                        tabs.push(SYSTEM_SOCIAL);
                    }
                    if (tabsStr.indexOf(AtomFeed.PROMOTIONS) != -1) {
                        tabs.push(SYSTEM_PROMOTIONS);
                    }
                    if (tabsStr.indexOf(AtomFeed.UPDATES) != -1) {
                        tabs.push(SYSTEM_UPDATES);
                    }
                    if (tabsStr.indexOf(AtomFeed.FORUMS) != -1) {
                        tabs.push(SYSTEM_FORUMS);
                    }
                    
                    if (!lastFetchedGmailSettings) {
                        //sendGA("gmailSettings", "tabs", tabsStr);
                    }
                }
                
                await that.saveSetting("gmailSettings", {conversationViewMode:conversationViewMode, tabs:tabs});
            } else {
                throw new Error("no data");
            }

            that.saveSetting("lastFetchedGmailSettings", new Date());
        }
   }
   
   function fetchLabelsFromHtmlSource() {
		var labels = [];
		   
		return fetchGmailIdKey().then(idKey => {
			return ajax({
				type: "GET",
				dataType: "text",
				url: that.getMailUrl({useStandardGmailUrl:true, urlParams:"ui=2&view=omni&rt=j&ik=" + idKey}), // "ui=2&view=up&rt=c&ik=" + idKey
				timeout: seconds(7)
			}).then(data => {
				var labelStartStr = '[[[';
				var startIndex = data.indexOf(labelStartStr);
				if (startIndex != -1) {
					//startIndex += labelStartStr.length;
                    //var endIndex = data.indexOf(']]', startIndex) + 2;
                    var endIndex = data.length;
					var length = endIndex - startIndex;
                    var labelsRawStr = data.substr(startIndex, length);
                    var labelsRawObj = JSON.parse(labelsRawStr);

                    const obj = labelsRawObj[0];
                    for (let a=0; a<obj.length; a++) {
                        if (obj[a][0] == "omni") {
                            const obj2 = obj[a][1];
                            for (let b=0; b<obj2.length; b++) {
                                var labelName = obj2[b][0];
                                if (labelName.indexOf("^") != 0) {
                                    labels.push({id:labelName, name:labelName});
                                }
                            }
                            break;
                        }
                    }
				} else {
					var error = "did not find label search str: " + labelStartStr;
					logError(error);
					return Promise.reject(error);
				}
			});
		}).catch(error => {
			logError("An error occured while fetching globals: " + error);
            console.warn("trying alternative fetch for labels");
            return ajaxBasicHTMLGmail({
                type: "GET",
                dataType: "text",
                url: that.getMailUrl({useBasicGmailUrl:true}),
                timeout: 7000
            }).then(data => {
				var startIndex = data.indexOf("<select name=tact>");
				if (startIndex != -1) {
					var endIndex = data.indexOf("</select>", startIndex);
					var html = data.substring(startIndex, endIndex);
					$(html).find("option").each(function() {
						var label = $(this).attr("value");
						if (label.indexOf("ac_") == 0) {
							var labelName = label.substring(3);
							labels.push({id:labelName, name:labelName});
						}
					});
				} else {
					var error = "Error getting labels backup method";
					logError(error);
					return Promise.reject(error);
				}
			});			
		}).then(() => {
			return {labels:labels};
		});
   }
   
   this.getLabels = function(forceRefresh) {
	   return new Promise((resolve, reject) => {
		   if (labels && !forceRefresh) {
			   resolve({labels:labels});
		   } else {
				if (accountAddingMethod == "autoDetect") {
					fetchLabelsFromHtmlSource().then(response => {
						console.log("fetchlabels", response);
						if (response.labels) {
							response.labels.sort(function(a, b) {
								if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
								if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
								return 0;
							});
						}
						resolve(response);
					}).catch(error => {
						reject(error);
					});
				} else {
					oAuthForEmails.send({userEmail:mailAddress, url: GmailAPI.URL + "labels", noCache:true}).then(response => {
						labels = response.data.labels;
						
						var userLabels = [];
						if (labels) {
							for (var a=0; a<labels.length; a++) {
								if (labels[a].type == "user") {
									userLabels.push(labels[a]);
								}
							}
						}
						
						userLabels.sort(function(a, b) {
							if (a.name < b.name) return -1;
							if (a.name > b.name) return 1;
							return 0;
						});
						
						// cache it here
						labels = userLabels;
						
						resolve({labels:labels});
					}).catch(function(error) {
						reject(error); 
					});
				}
	 	   }
	   });
   }
   
   this.fetchSendAs = function() {
		return oAuthForEmails.send({userEmail:that.getAddress(), url: GmailAPI.URL + "settings/sendAs"}).then(async response => {
			var sendAsData = response.data
			await that.saveSetting("sendAsData", sendAsData);
			return sendAsData;
		});
   }
   
   this.hasSignature = async function() {
		var sendAsData = await that.getSetting("sendAsData");
		if (sendAsData) {
			var foundASignature = sendAsData.sendAs.some(sendAs => {
				if (sendAs.signature) {
					return true;
				}
			});
			return foundASignature;
		}
   }
   
   // for auto-detect just ignore, for oauth remove it
   this.remove = async function(oAuthForEmails, accounts) {
       if (accountAddingMethod == "autoDetect") {
           await that.saveSetting("ignore", true);
       } else {
           let tokenResponse = await oAuthForEmails.findTokenResponse({ userEmail: that.getAddress() });
           if (tokenResponse) {
               removeCachedAuthToken(tokenResponse.access_token);
           }
           oAuthForEmails.removeTokenResponse({ userEmail: that.getAddress() });

           const foundAccount = accounts.some((account, i) => {
               console.log("account", account.getAddress());
               if (account.getAddress() == that.getAddress()) {
                   console.log("remove:", account);
                   account.stopWatchAlarm();
                   accounts.splice(i, 1);
                   return true;
               }
           });

           if (foundAccount) {
               await serializeOauthAccounts();
           }
       }
   }

   // Construct a new mail object
   function MailObject() {

	   var that = this;
	   
	   this.allFiles = [];
	   
	   this.queueFile = function(messageId, file) {
			var queuedFile = {filename:file.filename, size:file.body.size};
			queuedFile.fetchPromise = that.account.fetchAttachment({messageId:messageId, attachmentId:file.body.attachmentId, size:file.body.size});
			that.allFiles.push(queuedFile);
			return queuedFile;
	   }
	   
	   this.getName = function(parsedAddress) {
		   
		   var name;
		   var email;
		   
		   // if message is passed used the 
		   if (parsedAddress) {
			   name = parsedAddress.name;
			   email = parsedAddress.email;
		   } else {
			   name = that.authorName;
			   email = that.authorMail;
		   }

		   if (name == null || name.length < 1) {
			   if (email) {
				   name = email.split("@")[0];
			   } else {
				   name = email;
			   }
			   return name;
		   } else {
			   return $.trim(name);
		   }
	   }

	   this.getShortName = function() {
		   var name = that.getName();
		   if (name) {
			   name = name.split(" ")[0];
		   }
		   return name;
	   }
	   
	   this.getDate = function(twentyFourHourMode) {
		   return that.issued.displayDate({relativeDays:true, twentyFourHourMode:twentyFourHourMode});
	   }

	   this.open = function(params) {
		   params = initUndefinedObject(params);
		   
		   params.mail = that;
		   that.account._openMailInBrowser(params);
	   }
	   
	   this.getUrl = function() {
		   return that.account.getMailUrl({mail:that, useGmailUI:true});
	   }

	   // params is optional
	   this.markAsRead = function(params) {
		   params = initUndefinedObject(params);
		   
		   var executeMailActionParams = clone(params);
		   
		   // append these params
		   executeMailActionParams.mail = that;
		   executeMailActionParams.action = MailAction.MARK_AS_READ;
		   return executeMailAction(executeMailActionParams);
	   }

	   this.markAsUnread = function() {
		   return executeMailAction({mail:that, action:MailAction.MARK_AS_UNREAD});
	   }

	   this.deleteEmail = async function(params) {
		    params = initUndefinedObject(params);
		   
		    // must clone it because i stuck in a loop below because params was modified in .markAsRead and it in turn modified executeMailActionParams later
		    var executeMailActionParams = clone(params);
		   
		    // append these params
		    executeMailActionParams.mail = that;
		    executeMailActionParams.action = MailAction.DELETE;
		   
            if (await storage.get("deletingMarksAsRead")) {
                await that.markAsRead(params);
                // 2 scenarios: instantlyUpdatedCount was already executed before this method was called or markasread above should have updated the count so let's not update it again with the executeMailAction
                executeMailActionParams.instantlyUpdatedCount = true;
            }
            return executeMailAction(executeMailActionParams);
	   }

	   this.archive = async function(params) {
		    params = initUndefinedObject(params);
		   
		    var executeMailActionParams = clone(params);
		   
		    // append these params
		    executeMailActionParams.mail = that;
		    executeMailActionParams.action = MailAction.ARCHIVE;
		   
            if (await storage.get("archive_read")) {
                await that.markAsRead(params);
                // 2 scenarios: instantlyUpdatedCount was already executed before this method was called or markasread above should have updated the count so let's note update it again with the executeMailAction
                executeMailActionParams.instantlyUpdatedCount = true;
            }
            return executeMailAction(executeMailActionParams);
	   }

	   this.markAsSpam = function(params) {
		   params = initUndefinedObject(params);
		   
		   var executeMailActionParams = clone(params);
		   
		   // append these params
		   executeMailActionParams.mail = that;
		   executeMailActionParams.action = MailAction.MARK_AS_SPAM;
		   
		   return executeMailAction(executeMailActionParams);
	   }

	   this.moveLabel = function(params) {
		   return new Promise(function(resolve, reject) {
			   console.log("move label", that.labels);
			   if (that.labels.length) {
				   var emailMightBeInInbox = false;
	
				   // find "possibly" inbox label: archive it first and then label it										   
				   $.each(that.labels, function(index, label) {
					   console.log("label: ", label);
					   if (isSystemLabel(label)) { // possibly inbox email
						   console.log("system label: ", label);
						   emailMightBeInInbox = true;
						   that.archive().then(function() {
							   resolve();
						   }).catch(function(error) {
							   reject(error);
						   })
						   return false;
					   }
				   });
	
				   // if only 1 label (and not possibly in inbox) then remove it and apply new label
				   if (that.labels.length == 1 && !emailMightBeInInbox) {
					   that.removeLabel(that.labels.first()).then(function() {
						   resolve();
					   }).catch(function(error) {
						   reject(error);
					   });
				   } else {
					   resolve();
				   }
			   } else {
				   var error = "no labels for email";
				   logError(error);
				   reject(error);
			   }
		   }).then(function() {
			   return that.applyLabel(params.newLabel);
		   });
	   }
	   
	   this.untrash = function(params) {
		   console.log("untrash");
		   params = initUndefinedObject(params);
		   
		   var executeMailActionParams = clone(params);
		   
		   // append these params
		   executeMailActionParams.mail = that;
		   executeMailActionParams.action = MailAction.UNTRASH;

		   return executeMailAction(executeMailActionParams);
	   }

	   this.applyLabel = function(label) {
           const mail = that;
		   if (mail.account.getAccountAddingMethod() == "oauth") {
			   label = getGmailAPILabelId(label);
		   }
		   return executeMailAction({mail:mail, action:MailAction.APPLY_LABEL, label:label});
	   }

	   this.removeLabel = function(label) {
		   console.log("remove label");
		   return executeMailAction({mail:that, action:MailAction.REMOVE_LABEL, label:label});									   
	   }

	   this.star = async function() {
		    var executeMailActionParams = {};
		   
		    // append these params
		    executeMailActionParams.mail = that;
		    executeMailActionParams.action = MailAction.STAR;
		   
            if (await storage.get("starringAppliesInboxLabel") && that.account.getAccountAddingMethod() == "oauth" && !await that.hasLabel(SYSTEM_INBOX)) {
                await that.applyLabel(SYSTEM_INBOX);
                // 2 scenarios: instantlyUpdatedCount was already executed before this method was called or markasread above should have updated the count so let's note update it again with the executeMailAction
                executeMailActionParams.instantlyUpdatedCount = true;
            }
            return executeMailAction(executeMailActionParams);
	   }

	   this.removeStar = function() {
		   return executeMailAction({mail:that, action:MailAction.REMOVE_STAR});
	   }

	   this.starAndArchive = function() {
		   return that.star().then(function() {
			   return that.archive();
		   });
	   }
	   
	   this.postReply = function(message, replyAllFlag) {
		   return executeMailAction({mail:that, action:MailAction.REPLY, message:message, replyAllFlag:replyAllFlag});
	   }

	   this.generateReplyObject = async function(params) {
		   params = initUndefinedObject(params);
		   
		   var replyObj = {replyAction:true};
		   var quotedContent;
		   console.log("generatereplyobj:", that);
		   if (that.messages && that.messages.last()) { // added the check for that.messages because of this bug when using manual add https://jasonsavard.com/forum/discussion/4476/uncaught-typeerror-cannot-read-property-alreadyrepliedto-of-undefined-js-mailaccount-js-3988
			   var lastMessage = that.messages.last();

			   // user might be doing a 2nd immediate reply so use the previous/original message to build the reply
			   if (lastMessage.alreadyRepliedTo && that.messages.length >= 2) {
				   lastMessage = that.messages[that.messages.length-2];
			   }
			   
			   if (that.deliveredTo && that.deliveredTo.length) {
				   replyObj.from = {};
				   replyObj.from = addressparser(that.deliveredTo.last()).first();
				   
				   // let's override the alias if it's same email as manually added then let's use the alias, else assume it's a different "send mail as"
				   if (that.account.getAddress() == replyObj.from.email) {
					   var profileInfo = await that.account.getSetting("profileInfo");
					   if (profileInfo && profileInfo.displayName) {
						   replyObj.from.name = profileInfo.displayName;
					   }
				   } else {
					   // let's try to use the name/email from the sender's to field
					   function findMatchingAddress(ary, email) {
						   for (var a=0; ary && a<ary.length; a++) {
							   if (ary[a].email == email) {
								   return ary[a];
							   }
						   }
					   }
					   
					   var matchingAddress = findMatchingAddress(lastMessage.to, replyObj.from.email);
					   if (!matchingAddress) {
						   matchingAddress = findMatchingAddress(lastMessage.cc, replyObj.from.email);
					   }
					   if (!matchingAddress) {
						   matchingAddress = findMatchingAddress(lastMessage.bcc, replyObj.from.email);
					   }
					   
					   if (matchingAddress) {
						   replyObj.from.name = matchingAddress.name;
					   }
				   }
			   }
			   
			   // always use the name from the from field, but will try to identify the email from either the reply-to or the from field
			   var fromObj = {name:lastMessage.from.name, email:lastMessage.from.email};
			   
			   // if alternate reply-to email then override the from email
			   if (that.replyTo) {
				   //fromObj.email = that.replyTo;
				   fromObj = addressparser(that.replyTo).first();
			   }
			   replyObj.tos = [fromObj];

			   // save replyall object for possible use later when choosing reply or reply all
			   replyObj.replyAll = {};
			   replyObj.replyAll.tos = replyObj.tos.concat(removeSelf(lastMessage.to));
			   replyObj.replyAll.ccs = removeSelf(lastMessage.cc);

			   function removeSelf(ary) {
				   if (ary) {
					   // must clone it
					   ary = ary.concat();
					   for (var a=0; a<ary.length; a++) {
						   if (ary[a].email == mailAddress) {
							   ary.splice(a, 1);
							   break;
						   }
					   }
				   } else {
					   ary = [];
				   }
				   return ary;
			   }

			   console.log("replyallobj:", replyObj.replyAll);

			   if (params.replyAllFlag) {
				   replyObj.tos = replyObj.replyAll.tos
				   replyObj.ccs = replyObj.replyAll.ccs;
			   }

			   // used to group replies by converstion in Gmail etc.
			   var inReplyTo = lastMessage["message-id"];
			   if (inReplyTo) {
				   replyObj.inReplyTo = inReplyTo;
			   }
			   quotedContent = lastMessage.content;
		   } else {
			   var toObj = {};
			   toObj.email = that.authorMail;
			   toObj.name = that.getName();
			   
			   replyObj.tos = [toObj];

			   quotedContent = that.summary;
		   }

		   if (params.type == "text") {
			   // text
			   var subject = that.title;
			   if (subject) {
				   subject = subject.htmlToText();
			   } else {
				   subject = "";
			   }
			   subject = (subject.search(/^Re: /i) > -1) ? subject : "Re: " + subject; // Add 'Re: ' if not already there
			   replyObj.subject = subject;
			   // warning: $.trim removes \r\n (and this trim was is used in the .summarize
			   replyObj.message = "\r\n\r\n" + that.issued.toString() + " <" + that.authorMail + ">:\r\n" + that.getLastMessageText().htmlToText().summarize(600); // summarize body because or else we get a 414 or 413 too long url parameters etc.;
		   } else {
			   // html
			   replyObj.subject = that.title;
			   replyObj.message = "";
			   if (params.message) {
				   replyObj.message += params.message;
			   }
			   replyObj.message += "<blockquote type='cite' style='border-left:1px solid #ccc;margin-top:20px;margin-bottom:10px;margin-left:50px;padding-left:9px'>" + quotedContent + "</blockquote>";
		   }
		   return replyObj;
	   }

	   this.reply = async function() {
		   var replyObject = await that.generateReplyObject({type:"text"});

		   console.log("reply:", replyObject);

		   that.account.openCompose(replyObject);

		   if (await storage.get("replyingMarksAsRead")) {
			   that.markAsRead();
		   }
	   }

	   this.getThread = function(params) {
		   params = initUndefinedObject(params);
		   
		   params.mail = that;

		   // for auto-detect - if already fetched thread/messages
		   // for oauth - should have aleady been fetched so just return it
		   if (params.mail.messages || that.account.getAccountAddingMethod() == "oauth") {
			   return Promise.resolve(params);
		   } else {
			   // refresh thread
			   return fetchThread(params);
		   }
	   }
	   
	   this.getMessageById = function(id) {
		   for (var a=0;a<that.messages.length; a++) {
			   if (that.messages[a].id == id) {
				   return that.messages[a];
			   }
		   }
	   }
	   
	   this.removeMessageById = function(id) {
		   for (var a=0;a<that.messages.length; a++) {
			   if (that.messages[a].id == id) {
				   that.messages.splice(a, 1);
				   return true;
			   }
		   }
	   }

	   // params... {maxSummaryLetters:170, htmlToText:true, EOM_Message:" [" + getMessage("EOM") + "]"}
	   this.getLastMessageText = function(params) { // optional maxletters
		   if (!params) {
			   params = {};
		   }
		   
		   var appendEOM;
		   
		   var lastMessageText;
		   // if we are getting the summary from whole message than we can use the EOM, else if we use the brief summary from the atom feed we don't know for sure if it's cut off etc.
		   if (that.messages && that.messages.length) {
			   lastMessageText = that.messages.last().textContent;
			   if (lastMessageText) {
				   if (params.htmlToText) {
					   lastMessageText = lastMessageText.htmlToText();
				   }
				   if (params.maxSummaryLetters) {
					   if (params.targetNode) {
						   // append EOM to node at the end only
						   if (showEOM && params.EOM_Message && lastMessageText.length <= params.maxSummaryLetters) {
							   appendEOM = true;
						   }
						   lastMessageText = lastMessageText.summarize(params.maxSummaryLetters);
					   } else {
						   lastMessageText = lastMessageText.summarize(params.maxSummaryLetters, showEOM ? params.EOM_Message : null);
					   }
				   }
			   }
		   }

		   // can happen when could not parse body from print page
		   if (!lastMessageText) {
			   lastMessageText = that.summary;

			   if (lastMessageText) {
				   if (params.htmlToText) {
					   lastMessageText = lastMessageText.htmlToText();
				   }												
				   if (lastMessageText && params.maxSummaryLetters) {
					   // seems like ... doesn't always exist in atom feed? so cant be sure there more text
					   lastMessageText = lastMessageText.summarize(params.maxSummaryLetters);
				   }
			   }
		   }
		   
		   if (!lastMessageText) {
			   lastMessageText = "";
		   }
		   
		   if (params.targetNode) {
			   params.targetNode.text(lastMessageText);
			   if (appendEOM) {
				   params.targetNode.append(params.EOM_Message);
			   }
			   return params.targetNode;
		   } else {
			   return lastMessageText;			   
		   }
	   }

	   this.hasAttachments = function() {
			if (that.messages && that.messages.length) {
				if (that.account.getAccountAddingMethod() == "oauth") {
					if (that.messages.last().files && that.messages.last().files.length) {
						return true;
					}
				} else { // auto-detect
					// ISSUE, see we don't preload content of email in auto-detect we can't detect attachments, and might not want to preload for optimization
				}
			}
	   }
	   
	   this.removeFromArray = function() {
		   for (var a=0; a<mailArray.length; a++) {
			   if (that.id == mailArray[a].id) {
				   mailArray.splice(a, 1);
				   break;
			   }
		   }
	   }
	   
	   this.sortMessages = function() {
		   that.messages.sort(function(message1, message2) {
			   var date1 = message1.date;
			   var date2 = message2.date;
			   if (date1.getTime() == date2.getTime()) {
				   return 0;
			   } else {
				   return date1.getTime() < date2.getTime() ? -1 : 1;
			   }
		   });
	   }

	   this.generateAuthorsNode = function() {
		   var $node = $("<span/>");

		   if (that.account.getAccountAddingMethod() == "autoDetect") {
			   
			   var useMessages = that.messages && that.messages.length;
			   if (that.contributors.length >= 1) {
				   // the feed does not put the original author as first contributor if they have replied in the thread (ie. last author) so make sure they're first if so
				   var name = "someone";
				   var nextContributorIndex = 0;
				   if (useMessages) {
					   if (that.messages.first().from.email == that.contributors.last().find("email").text()) {
						   //console.log("last contr is valid original author: " + that.messages.first().from.email);
						   name = that.contributors.last().find("name").text().split(" ")[0];
						   nextContributorIndex = 0;
					   } else {
						   name = that.getName(that.messages.first().from).getFirstName();
						   nextContributorIndex = 1;
					   }
				   } else {
					   if (that.contributors.length) {
						   name = that.contributors.first().find("name").text().getFirstName();
					   }
				   }
				   
				   $node.append(name);

				   // if more conversations than contributors (happens when several exchanges are done from the original author)
				   if (useMessages && that.messages.length > that.contributors.length+1) {
					   $node.append(" .. ");
				   } else {
					   if (useMessages) {
						   if (that.contributors.length == 2) {						
							   $node.append( ", ", $("<span>").text(that.contributors.eq(nextContributorIndex).find("name").text().split(" ")[0]) );
						   } else if (that.contributors.length >= 3) {
							   $node.append( " .. ", $("<span>").text(that.contributors.first().find("name").text().split(" ")[0]) );
						   }
						   $node.append(", ");
					   } else {
						   if (that.contributors.length == 2) {
							   $node.append(", ");
						   } else {
							   $node.append(" .. ");
						   }
					   }
				   }
				   
				   $node.append( $("<span class='unread'>").text(that.getShortName()) );
				   if (useMessages) {
					   $node.append( " (" + (that.messages.length) + ")" );
				   }
			   } else {
				   $node
				   		.text( that.getName() )
				   		.addClass("unread")
				   		.attr("title", that.authorMail)
				   ;
			   }			   
		   } else {
			   // using <= because seems .messages might have been zero length
			   if (that.messages.length <= 1) {
				   $node
				   		.text(that.getName())
				   		.addClass("unread")
				   		.attr("title", that.authorMail)
				   ;
			   } else {
				   var separator;
				   if (that.messages.length == 2) {
					   separator = ", ";
				   } else {
					   separator = " .. ";
				   }
				   
				   var firstSender;
				   var lastSender;
				   
				   try {
					   firstSender = that.getName(that.messages.first().from).getFirstName();
					   lastSender = that.getName(that.messages.last().from).getFirstName();
					   $node.append( $("<span class='unread'>").text(firstSender), separator, $("<span class='unread'>").text(lastSender) );
				   } catch (e) {
					   $node.append( $("<span class='unread'>").text(that.getName()) );
					   console.warn("problem parsing author name: " + e);
				   }
				   
				   $node.append(" (" + (that.messages.length) + ")");
			   }
		   }

		   return $node;
	   }

	   // pass in system_ label
	   this.hasLabel = async function(labelId) {
           for (var a = 0; a < that.labels.length; a++) {
               if (getJSystemLabelId(that.labels[a], that.account.getAccountAddingMethod()) == labelId) {
                   return true;
               }
           }
	   }
	   
	   this.getDisplayLabels = function(excludeInbox) {
		   var labels = [];
		   
		   that.labels.forEach(function(labelId) {
			   var labelObj = {id:labelId};
			   var systemLabelId = getJSystemLabelId(labelId);
			   
			   if (systemLabelId == SYSTEM_INBOX) {
				   if (excludeInbox) {
					   return;
				   } else {
					   labelObj.name = getMessage("inbox");
				   }
			   } else if (systemLabelId == SYSTEM_PRIMARY || systemLabelId == SYSTEM_ALL_MAIL || systemLabelId == SYSTEM_IMPORTANT || systemLabelId == SYSTEM_IMPORTANT_IN_INBOX || systemLabelId == SYSTEM_STARRED) {
				   // don't add this, continue loop
				   return;
			   } else if (systemLabelId == SYSTEM_PURCHASES) {
				   labelObj.name = getMessage("purchases");
			   } else if (systemLabelId == SYSTEM_FINANCE) {
				   labelObj.name = getMessage("finance");
			   } else if (systemLabelId == SYSTEM_SOCIAL) {
				   labelObj.name = getMessage("social");
			   } else if (systemLabelId == SYSTEM_PROMOTIONS) {
				   labelObj.name = getMessage("promotions");
			   } else if (systemLabelId == SYSTEM_UPDATES) {
				   labelObj.name = getMessage("updates");
			   } else if (systemLabelId == SYSTEM_FORUMS) {
				   labelObj.name = getMessage("forums");
			   } else if (labelId == GmailAPI.labels.SENT || labelId == GmailAPI.labels.UNREAD || labelId == GmailAPI.labels.IMPORTANT) {
				   // Note using labeId here instead of systemLabelId
				   // don't add this, continue loop
				   return;
			   } else {
				   labelObj.name = that.account.getLabelName(labelId);
			   }

			   labelObj.color = that.account.getLabelColor(labelId);
			   
			   labels.push(labelObj);
		   });
		   
		   labels.sort(function(a, b) {
			   if (a.name && b.name) {
				   if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
				   if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
			   }
			   return 0;
		   });
		   
		   return labels;
	   }

   };
   
}
