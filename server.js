var express = require('express')
,   app = express()
,   multer  = require('multer')
,   img = require('easyimage')
,   fs = require("fs")
,   sizeOf = require('image-size')
,   request = require('request')
,   execFile = require('child_process').execFile
,   gifsicle = require('gifsicle').path;

var hbs = require('hbs');
 
app.set('view engine', 'hbs');
app.engine('html', hbs.__express);


// set max height in pixels
var height = 175;
// maxFileSize in kB
var maxFileSize = 200;
// only handle gifs
var imgs = ['gif']; 

// helper functions
function getExtension(fn) {
    return fn.split('.').pop();
}

function getFileName(fn) {
    return fn.split('/').pop();
}

function fnAppend(fn, insert) {
    var arr = fn.split('.');
    var ext = arr.pop();
    insert = (insert !== undefined) ? insert : new Date().getTime();
    return arr + '.' + insert + '.' + ext;
}

app.configure(function () {
    app.use(multer({
        dest: './static/uploads/',
        rename: function (fieldname, filename) {
            return filename.replace(/\W+/g, '-').toLowerCase();
        }
    }));
    app.use('/static', express.static(__dirname + '/static'));
});

app.get('/', function(req, res) {
    res.render('index')
});

app.post('/api/upload', function (req, res) {
    console.log(req.files.length);
    if (req.files.length == undefined && req.body.gifUrl) {
        console.log('in here');
        request.get({url: req.body.gifUrl, encoding: 'binary'}, function (err, response, body) {
            var fileName = __dirname + "/static/uploads/" + Date.now() + getFileName(req.body.gifUrl);
            fs.writeFile(fileName, body, 'binary', function(err) {
                if (err) { throw err; }
                convertGif(res, fileName, height);
            }); 
        });
    } else {
        if (req.files.userFile.extension == 'gif') {
            console.log('image get');
            img.info(req.files.userFile.path, function (err, stdout, stderr) {
                if (err) throw err;

                convertGif(res, req.files.userFile.path, height);

            });
        } else {
            console.log('else');
            res.send({image: false, file: req.files.userFile.originalname, outout: req.files.userFile.name, reason: "not an image or gif"});
            return false;
        }
    }
});

var server = app.listen(process.env.PORT || 3000, function () {
    console.log('listening on port %d', server.address().port);
});

// gif stuff here

function resizeGif(res, inputLocation, outputLocation, height, callback) {
    console.log('in resizegif');
    if (getFilesizeInkB(inputLocation) < 200 && sizeOf(inputLocation)['height'] < 200)  {
        res.send({image: true, file: inputLocation, output: inputLocation, reason: "already small"});
        return false;
    }
    console.log('not right size');
    execFile(gifsicle, ['--output', outputLocation, '--resize-height', height, inputLocation], function (err) {
        if (err) { throw err; }
        var resized = checkFileSize(outputLocation);
        console.log('in resizing');
        callback(resized);
    })
}


function getFilesizeInkB(filename) {
    var stats = fs.statSync(filename)
    var fileSizeInBytes = stats["size"]
    return fileSizeInBytes / 1000
}

function checkFileSize(outputLocation) {
    var fileSize = getFilesizeInkB(outputLocation)
    if (fileSize < 200) {
        console.log({image: true, file: outputLocation, output: outputLocation, size: fileSize});
        return {image: true, file: outputLocation, output: outputLocation, size: fileSize}
    } else {
        return {image: false, file: outputLocation, size: fileSize}
    }
}

function optimizeGif(inputLocation, outputLocation, callback){
    var converted = false;
    execFile(gifsicle, ['--output', outputLocation, '-O3', inputLocation], function (err) {
        if (err) {
            throw err;
        }
        var optimized = checkFileSize(outputLocation);
        callback(optimized);
    });
}

function convertGif(res, inputLocation, height) {
    resizeGif(res,
        inputLocation, 
        fnAppend(inputLocation, 'resized'),
        height,
        function(resized) {
             console.log('in callback resized');
            if (resized.image == true) {
                console.log('resized');
                res.send(resized);
                return false;
            } else {
                console.log(resized);
                optimizeGif(resized.file, 
                    fnAppend(resized.file, 'optimized'), 
                    function(optimized) {
                        console.log('optim');
                        res.send(optimized);
                        return false;
                    });
           } 
        }
    );
}