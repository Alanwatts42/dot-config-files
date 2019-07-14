// Saves options to chrome.storage
function save_options() {
    var fontSize = document.getElementById('font-size').value;
    var lineHeight = document.getElementById('line-height').value;

    localStorage["fontSize"]=fontSize;
    localStorage["lineHeight"]=lineHeight;
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
}

function restore_options() {
    document.getElementById('font-size').value = (localStorage["fontSize"] || '20px');
    document.getElementById('line-height').value = (localStorage["lineHeight"] || '1.5em');
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
