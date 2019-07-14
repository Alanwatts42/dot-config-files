function closeWindow() {
	var windowId = localStorage["_permissionWindowId"];
	if (windowId) {
		localStorage.removeItem("_permissionWindowId");
		chrome.windows.remove(parseInt(windowId));
	}
	$("body").removeClass("page-loading-animation").append("You can close this window!");
	window.close();
}

function processOAuthUserResponse(oAuthForMethod, code, oauthFollowupMethod) {
	var tokenResponse;
	
	return oAuthForMethod.getAccessToken({code:code}).then(accessTokenResponse => {
		console.log("accessTokenResponse", accessTokenResponse);
		tokenResponse = accessTokenResponse.tokenResponse;
		return oauthFollowupMethod(tokenResponse);
	}).then(sendMessageParams => {
		return new Promise((resolve, reject) => {
			if (isPopupOrOptionsOpen()) {
				// append oauth token in case needed
				sendMessageParams.tokenResponse = tokenResponse;
				chrome.runtime.sendMessage(sendMessageParams, () => {
					closeWindow();
					resolve();
				});
			} else {
				location.href = chrome.runtime.getURL("popup.html?source=oauth");
				resolve();
			}
		});
	});
}

function isPopupOrOptionsOpen() {
	return chrome.extension.getViews().some(thisWindow => {
		if (thisWindow.location.href.indexOf("popup.html") != -1 || thisWindow.location.href.indexOf("options.html") != -1) {
			return true;
		}
	});
}

function showError(error) {
	$("body").removeClass("page-loading-animation");
	$("body").text(error);
}

$(document).ready(() => {

	(async () => {

        await initUI();

		var code = getUrlValue(location.href, "code", true);
		if (code) {	
			var securityToken = getUrlValue(location.href, "security_token");
			
			var processOAuthUserResponsePromise;

			if (securityToken == oAuthForEmails.getSecurityToken()) {
				processOAuthUserResponsePromise = processOAuthUserResponse(oAuthForEmails, code, tokenResponse => {
					// do nothing
					return Promise.resolve({command:"grantPermissionToEmails"});
				});
			} else if (securityToken == oAuthForProfiles.getSecurityToken()) {
				processOAuthUserResponsePromise = processOAuthUserResponse(oAuthForProfiles, code, tokenResponse => {
					return oAuthForProfiles.send({
						userEmail:	tokenResponse.userEmail,
						url:		"https://people.googleapis.com/v1/people/me",
						data:		{
							"personFields":	"names,photos"
						}
					}).then(async response => {
						var data = response.data;
						if (data) {
							console.log(data);
							if (data.photos && data.photos[0].url) {
								var account = getAccountByEmail(tokenResponse.userEmail);
								await account.saveSetting("profileInfo", {
									displayName:	data.names[0].displayName,
									imageUrl:		data.photos[0].url
								});
								return {command:"profileLoaded"};
							} else {
								throw new Error("No profile picture found");
							}
						}
					});
				});
			} else if (securityToken == oAuthForContacts.getSecurityToken()) {
				processOAuthUserResponsePromise = processOAuthUserResponse(oAuthForContacts, code, tokenResponse => {
					return fetchContacts(tokenResponse.userEmail).then(async response => {
						var contactsData = await storage.get("contactsData");
						if (!contactsData) {
							contactsData = [];
						}
						
						var dataIndex = getContactsDataIndexByEmail(contactsData, response.contactDataItem.userEmail);
						if (dataIndex != -1) {
							console.log('found: updating existing contactsDataItem')
							contactsData[dataIndex] = response.contactDataItem;
						} else {
							console.log("creating new contactsDataItem");
							contactsData.push(response.contactDataItem);
						}
						
						console.log("contactdata: ", contactsData);
						await storage.set("contactsData", contactsData);
						await storage.set("showContactPhoto", true);
						return {command: "grantPermissionToContacts", contactDataItem:response.contactDataItem};
					});
				});
			}
			
			if (processOAuthUserResponsePromise) {
				processOAuthUserResponsePromise.catch(error => {
					showError(error);
				});
			} else {
				showError("security_token not matched!");
			}
		} else {
			var url = "https://jasonsavard.com/wiki/Granting_access?ref=permissionDenied&ext=gmail";
			var openPromise;
			
			if (isPopupOrOptionsOpen()) {
				openPromise = openUrl(url);
			} else {
				openPromise = openUrl(url, parseInt(localStorage._currentWindowId));
			}
			
			openPromise.then(() => {
				closeWindow();
			});
		}
	})(); // end async
});