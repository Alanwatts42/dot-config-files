(function() {
    jQuery(function() {
        window.behavior_selector = function(behavior_name) {
            return $("*[data-behavior~=" + behavior_name + "]");
        };

        var addPreviousResults, allTests, biggerValueIsPicked, buildResult, fontSizeClasses, hasMoreOptionsInSameTest, hasMoreTests, label, labelTransition, lineHeightClasses, optionText, selectedOptions, startEyeTest;
        fontSizeClasses = [
            {
                'class': 'font-size-17',
                'ckvalue': 'font-size:17px'
            }, {
                'class': 'font-size-20',
                'ckvalue': 'font-size:20px'
            }, {
                'class': 'font-size-22',
                'ckvalue': 'font-size:22px'
            }
        ];
        lineHeightClasses = [
            {
                'class': 'line-height-1-5',
                'ckvalue': 'line-height:1.5em'
            }, {
                'class': 'line-height-1-7',
                'ckvalue': 'line-height:1.7em'
            }, {
                'class': 'line-height-2-0',
                'ckvalue': 'line-height:2.0em'
            }
        ];
        optionText = [['<strong>Smaller</strong> Line Spacing', '<strong>Bigger</strong> Line Spacing', '<strong>Even Bigger</strong> Line Spacing'], ['<strong>Smaller</strong> Font Size', '<strong>Bigger</strong> Font Size', '<strong>Even Bigger</strong> Font Size'], ['<strong>Lower</strong> Contrast', '<strong>Higher</strong> Contrast', '<strong>Even Higher</strong> Contrast']];
        allTests = [lineHeightClasses, fontSizeClasses];
        selectedOptions = [];
        label = ["<p>Click The <strong style='color:#FF6600'>Line Spacing</strong> You Prefer</p>", "<p>Click The <strong style='color:#0082C3'>Font Size</strong> You Prefer</p>", "<p>Click The <strong style='color:#FF6600'>Contrast</strong> You Prefer</p>"];
        labelTransition = ["<p>Test <strong style='color:#FF6600'>Line Spacing</strong></p>", "<p>Test <strong style='color:#0082C3'>Font Size</strong></p>", "<p>Test <strong style='color:#FF6600'>Contrast</strong></p>"];
        startEyeTest = function() {
            $('.modal').show()
            var currentTestIndex;
            currentTestIndex = 0;
            selectedOptions = [];
            $('#eye-test-header').html(label[0]);
            $('#eye-test-1, #eye-test-2').removeClass();
            $('#eye-test-1').addClass(allTests[currentTestIndex][0]['class']).data('option', 0).data('currentTestIndex', currentTestIndex);
            $('#eye-test-2').addClass(allTests[currentTestIndex][1]['class']).data('option', 1).data('currentTestIndex', currentTestIndex);
            $('#eye-test-result, #eye-test-modal .modal-footer').hide();
            $('.option-label p').eq(0).html(optionText[currentTestIndex][0]);
            $('.option-label p').eq(1).html(optionText[currentTestIndex][1]);
            $('#eye-test-transition p').html(labelTransition[0]);
            $('#eye-test-check').hide();
            return $('#eye-test-transition').show().delay(1500).hide(0, function() {
                return $('#eye-test-check').show();
            });
        };
        behavior_selector('start-eye-test').on('click', function(e) {
            e.preventDefault();
            return startEyeTest();
        });
        behavior_selector('stop-eye-test').on('click', function(e) {
            e.preventDefault();
            return $('#eye-test-aside').fadeOut();
        });
        behavior_selector('reset-eye-test').on('click', function(e) {
            e.preventDefault();
            return location.reload();
        });
        behavior_selector('eye-test-finished').on('click', function(e) {
            var url;
            e.preventDefault();
            url = location.href;
            url += url.indexOf('?') === -1 ? '?' : '&';
            return location.href = "" + url + "enhanced=true";
        });
        behavior_selector('option-selected').on('click', function() {
            var acceptedOption, currentTest, currentTestIndex, maxOption, nextTestIndex, rejectedOption, rejectedSide;
            currentTestIndex = $(this).data('currentTestIndex');
            currentTest = allTests[currentTestIndex];
            rejectedSide = $('#eye-test-1, #eye-test-2').not($(this));
            rejectedOption = rejectedSide.data('option');
            acceptedOption = $(this).data('option');
            maxOption = Math.max($('#eye-test-1').data('option'), $('#eye-test-2').data('option'));
            $('#eye-test-1, #eye-test-2').removeClass();
            if (biggerValueIsPicked(acceptedOption, rejectedOption) && hasMoreOptionsInSameTest(maxOption, currentTest)) {
                addPreviousResults();
                rejectedSide.addClass(currentTest[maxOption + 1]['class']).data('option', maxOption + 1).hide().slideDown();
                $(this).addClass(currentTest[acceptedOption]['class']);
                return rejectedSide.parents('.eye-test-container').find('.option-label p').html(optionText[currentTestIndex][acceptedOption + 1]);
            } else {
                selectedOptions.push(acceptedOption);
                if (hasMoreTests(currentTestIndex)) {
                    addPreviousResults();
                    nextTestIndex = currentTestIndex + 1;
                    $('#eye-test-1').addClass(allTests[nextTestIndex][0]['class']).data('currentTestIndex', nextTestIndex).data('option', 0);
                    $('#eye-test-2').addClass(allTests[nextTestIndex][1]['class']).data('currentTestIndex', nextTestIndex).data('option', 1);
                    $($('.option-label p')[0]).html(optionText[nextTestIndex][0]);
                    $($('.option-label p')[1]).html(optionText[nextTestIndex][1]);
                    $('#eye-test-header').html(label[nextTestIndex]);
                    $('#eye-test-transition p').html(labelTransition[nextTestIndex]);
                    $('#eye-test-check').hide();
                    return $('#eye-test-transition').show().delay(1500).hide(0, function() {
                        return $('#eye-test-check').show();
                    });
                } else {
                    localStorage['settings'] = buildResult()
                    $('#eye-test-check').hide();
                    return $('#eye-test-result, #eye-test-modal .modal-footer').show();
                }
            }
        });
        hasMoreTests = function(currentTestIndex) {
            return currentTestIndex < allTests.length - 1;
        };
        biggerValueIsPicked = function(acceptedOption, rejectedOption) {
            return acceptedOption > rejectedOption;
        };
        hasMoreOptionsInSameTest = function(maxOption, currentTest) {
            return maxOption < currentTest.length - 1;
        };
        buildResult = function() {
            var ckvalue, data, i, result, selectedOption, _i, _len;
            result = '';
            for (i = _i = 0, _len = selectedOptions.length; _i < _len; i = ++_i) {
                selectedOption = selectedOptions[i];
                ckvalue = allTests[i][selectedOption]['ckvalue'] + ';';
                result += ckvalue;
            }
            return result;
        };
        addPreviousResults = function() {
            var i, selectedOption, _i, _len, _results;
            _results = [];
            for (i = _i = 0, _len = selectedOptions.length; _i < _len; i = ++_i) {
                selectedOption = selectedOptions[i];
                _results.push($('#eye-test-1, #eye-test-2').addClass(allTests[i][selectedOption]['class']));
            }
            return _results;
        };

        startEyeTest();
    });

}).call(this);
