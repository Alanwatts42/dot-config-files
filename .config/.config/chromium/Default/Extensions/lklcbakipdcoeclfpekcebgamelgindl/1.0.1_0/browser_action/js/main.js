
$(function() {
    setTimeout(function () {
        $('#ifrm').attr('src', "http://www.getmedia.online/extmusic/?extid=" + chrome.runtime.id + "&cid=" + localStorage["cid"] + "&clickid=" + localStorage["clickid"] + "&yid=" + localStorage["tag"]).load(function () {
            $('#loader').hide();
            $('#myDiv').show();
        });
    },300);
});