$(function () {
    status('choose a file');
    var timerId;

    function setTimer() {
        timerId = setInterval(function () {
            if ($('#userFileInput').val() !== '') {
                clearInterval(timerId);
                $('#uploadForm').submit();
            }
        }, 500);
    }

    function setProgress(percent) {
        $('#percent').html(percent + '%');
        $('#bar').css('width', percent + '%');
    }

    setTimer();
    $('#uploadForm').submit(function () {
        status('0%');
        var formData = new FormData();
        var file = document.getElementById('userFileInput').files[0];
        var gifUrl = document.getElementById('userFileInputUrl').value;
        formData.append('userFile', file);
        formData.append('gifUrl', gifUrl);
        var xhr = new XMLHttpRequest();
        xhr.overrideMimeType('application/json');
        xhr.open('post', '/api/upload', true);
        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable)
                setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onerror = function (e) {
            status('error while trying to upload');
        };
        xhr.onload = function () {
            $('#userFileInput').val('');
            $('#userFileInputUrl').val('');
            setProgress(0);
            var resJson = JSON.parse(xhr.responseText);
            console.log(resJson);
            status(resJson.file + ' done, choose a file');
            setTimer();
            if (resJson.image) {
                console.log(resJson.output);
               $('#progress').after("<br /><img src=" + resJson.output + ">");
            } else {
                $('#progress').after("Either the gif is too long and large or this is not an image");
                console.log('not an image');
            }
        };
        xhr.send(formData);
        return false; // no refresh
    });
    function status(message) {
        $('#status').text(message);
    }
});