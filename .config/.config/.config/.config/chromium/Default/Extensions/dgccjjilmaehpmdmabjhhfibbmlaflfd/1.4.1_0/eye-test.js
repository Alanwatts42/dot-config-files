window.customizePage = function(settings) {
    var contrast, cookieArray, cookieValue, fontSize, i, key, lineHeight, value;
    cookieValue = settings;
    if (cookieValue != null) {
        cookieArray = cookieValue.split(";");
        i = 0;
        while (i < cookieArray.length) {
            key = cookieArray[i].split(":")[0];
            value = cookieArray[i].split(":")[1];
            if (key.indexOf("font-size") !== -1) {
                fontSize = value;
            }
            if (key.indexOf("line-height") !== -1) {
                lineHeight = value;
            }
            if (key.indexOf("contrast") !== -1) {
                contrast = parseFloat(value);
            }
            i++;
        }
        return $('p, span, blockquote, li, div').each(function() {
            if ($(this).offset().top > 150 &&  $(this).width() > 350 && (!$(this).is('div') || ($(this).is('div') && $(this).children('div').length == 0)) ) {
                var oldSize = $(this).css('font-size');
                if (oldSize.indexOf('px') > 0){
                    oldFontSize = parseInt(oldSize.substring(0, oldSize.indexOf('px')))
                    newFontSize = parseInt(fontSize.substring(0, fontSize.indexOf('px')))

                    if(oldFontSize < newFontSize) {
                        $(this).css('font-size', fontSize);
                    }
                }
                else {
                    $(this).css('font-size', fontSize);
                }

                $(this).css('line-height', lineHeight);
            }
        });
    }
};
