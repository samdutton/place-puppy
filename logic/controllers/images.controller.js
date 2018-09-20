const Image = require('../models/image.model.js')
const url = require('url')
const multer = require('multer')
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, '/uploads')
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + file.originalname)
    }
})
const upload = multer({storage: storage})
const sharp = require('sharp')
const fs = require('fs')
const session = require('express-session')
const cloudinary = require('cloudinary')
const https = require('https')
const Stream = require('stream').Transform

module.exports = {
    showImages: showImages,
    extractDims: extractDims,
    resize: resize,
    imageFormat: imageFormat,
    numFormat: numFormat,
    removeFwdSlash: removeFwdSlash,
    fullSeed: fullSeed,
    cloudinaryUploader: cloudinaryUploader,
    showImage: (req, res) => {
        var fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`
        // get pathname from url
        let pathName = url.parse(fullUrl)
        // regex checks to see if starts w /
        let re = /^\//ig
        // get pathname from url
        pathName = pathName.pathname
        if (pathName.match(re)) {
            console.log('inside')
            // slice out forward slash
            pathName = pathName.slice(1, pathName.length)
        }
        console.log('pathname', pathName)
        // url matches image from db - needs field
        let promise = Image.findOne({path: pathName}).exec()
        // check for promise okay
        if (!promise || promise === null) {
            console.log('That route does not exist')
            res.send('Error. That route does not exist')
            return
        }
        console.log('promise', promise)
        promise.then(img => {
            // check not null
            if (!img) {
                console.log('This data does not exist')
                res.send('Error. This data does not exist')
                return
            }
            console.log('img', img)

            let format = module.exports.imageFormat(img.contentType)
            format = 'png'
            let dims = module.exports.extractDims(pathName)
            //
            let width = parseInt(dims.width)
            let height = parseInt(dims.height)
            if (!width || !height) {
                console.log('width or height is null')
                return
            }
            // let src = `${__dirname}/JPEG_example_JPG_RIP_100.jpeg`

            res.type(`image/${format || 'jpg'}`);
            // call url from cloudinary
            https.get(img.src, (response) => {
                console.log('make http call')
                if (response.statusCode === 200) {
                    // console.log('res', response)
                    console.log('status', response.statusCode)
                    var data = new Stream();
                    response.on('data', (chunk) => {
                        // read chunks into stream
                        // console.log('res', response)
                        // console.log('data', chunk)
                        data.push(chunk);
                    })
                    response.on('end', () => {
                        console.log('in end')
                        // read data with.read()
                        data = data.read()
                        // make file and wrap in promise
                        fs.writeFile('./tmp/logo.jpg', data, 'binary', (err) => {
                            if (err)
                                throw err
                            console.log('image created')

                            return new Promise(function(resolve, reject) {
                                fs.writeFile('./tmp/logo.jpg', data, 'binary', (err) => {
                                    if (err)
                                        reject(err);
                                    else
                                        resolve(data);
                                    }
                                );
                                // resolve promise - resize and unlin
                            }).then(data => {

                                module.exports.resize('./tmp/logo.jpg', format, width, height).pipe(res)
                                // unlin from file
                                fs.unlink('./tmp/logo.jpg');
                                console.log('unlinked')
                            }).catch(err => {
                                console.error("An error in a promise show image", err)
                                res.send('An Err', err)
                            })
                        });
                    })
                } else {
                    console.error(`An http error occured`, response.statusCode)
                }
            })
            // }
        }).catch(err => {
            console.error("An error in the promise ending show", err)
            res.status(404).send(err)
        })
    },
    add: (req, res) => {
        // get file
        let file = req.file
        console.log(req.file.path)
        // if no file, kill
        if (!file) {
            req.flash('info', 'No file attached')
            res.redirect('add')
        }
        console.log('file', file)
        // if not image, kill
        if (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpeg') {
            console.log('File type is not an image')
            req.flash('info', 'File is not a image. Upload images only')
            res.redirect('add')
            return
        }
        // put image into cloudinary
        let promise = module.exports.cloudinaryUploader(file.path)
        promise.then(data => {
            console.log('data', data)
            // make image with data from cloudinary
            let image = new Image({
                filename: file.originalname,
                title: req.body.title,
                photographer: req.body.photographer,
                description: req.body.description,
                locationTaken: req.body.locationTaken,
                src: data.secure_url,
                contentType: file.mimetype,
                path: req.body['route-path']
            })

            console.log('image : ' + image);
            // console.log('base64' + String(image.data).substring(0, 50));
            // unlink form /uploads
            fs.unlink(file.path);
            // save to DB
            let promise = image.save()

            promise.then(image => {
                console.log('saved')
                req.flash('success', 'Image Saved')
                res.redirect('add')
            }).catch(e => {
                console.log(`image not saved, ${e}`)
                req.flash('error', `Image not Saved: ${e}`);
                res.redirect('add')
            })
        }).catch(err => {
            console.error('An error occured', err)
            res.redirect('add')
        })
    },
    // show view
    addFile: (req, res) => {
        // console.log('session user', req.session.user)
        // if(!req.session.user){
        //     return res.status(401).send()
        // }
        // var dog = {
        //     color:'white',
        //     fluffy: true
        // }
        // let myImage = new Image({
        //     photographer: 'no photographer',
        //     title: 'no title',
        //     locationTaken: 'no location_taken',
        //     tags:[]
        // })
        // console.log(res)
        // myImage.save(function(err, image){
        //     if(err) return console.error(err)
        //     console.log('saved')
        // })
        return res.render('add', {
            method: 'POST',
            action: '/add',
            enctype: 'multipart/form-data',
            fieldOne: 'Title',
            fieldTwo: 'Photographer',
            fieldThree: 'Description',
            fieldFour: 'Path to match',
            fieldFive: 'Upload',
            fieldSix: 'Alt Tag',
            buttonField: 'Submit',
            field_one_for: 'title',
            field_two_for: 'photographer',
            field_three_for: 'description',
            field_four_for: 'path-match',
            field_five_for: 'upload',
            field_six_for: 'alt',
            field_one_id: 'title',
            field_two_id: 'photographer',
            field_three_id: 'description',
            field_four_id: 'path-match',
            field_five_id: 'upload',
            field_six_id: 'alt',
            field_one_placeholder: 'Title of work',
            field_two_placeholder: "Photographer's name",
            field_three_placeholder: 'Describe Image',
            field_four_placeholder: 'Route path image should match i.e 100x100',
            field_five_placeholder: 'Upload',
            field_six_placeholder: 'Add alt tag',
            field_one_type: 'text',
            field_two_type: 'text',
            field_three_type: 'text',
            field_four_type: 'text',
            field_five_type: 'file',
            field_six_type: 'text',
            field_one_name: 'title',
            field_two_name: 'photographer',
            field_three_name: 'description',
            field_four_name: 'route-path',
            field_five_name: 'file',
            field_six_name: 'alt',
            routeName: req.path

        })
    }
}
function removeFwdSlash(req) {
    var fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`
    // get pathname from url
    let pathName = url.parse(fullUrl)
    // starts with /
    let re = /^\//ig
    // get pathname from url
    pathName = pathName.pathname
    if (pathName.match(re)) {
        // slice out forward slash
        pathName = pathName.slice(1, pathName.length)
        return pathName
    }
    return false
}
function numFormat(numStr) {
    console.log('numstr', numStr)
    // all nums before x
    var re1 = /\d+(?=\x)/g
    var beforeX = numStr.match(re1)
    if (!beforeX) {
        return false
    }
    // get x only if followed by num
    var re2 = /x(?=[0-9])/
    var afterX = numStr.match(re2)
    if (!afterX) {
        return false
    }
    return true
}
function extractDims(urlDims) {
    let pageUrl = urlDims
    let newUrl = url.parse(pageUrl)
    // all nums before x
    var re = /\d+(?=\x)/g
    //  get x only if followed by num
    // var secondNumRe = /x(?=[0-9])/

    // look behind doesn't work
    // var behind = /(?<=\x)\d+/g

    // get first num
    var width = newUrl.pathname.match(re).join('')
    // reverse String
    var reverseUrl = Array.from(newUrl.pathname).reverse().join('')
    // extract digits -
    var height = reverseUrl.match(re).join('')
    // un-reverse back to normal
    height = Array.from(height).reverse().join('')
    // var height = newStr.match(re)
    // second = Array.from(second).reverse().join('')
    return {width: width, height: height}
}

function showImages(req, res) {
    // if (!req.session.user) {
    //     return res.status(401).send()
    // }
    cloudinary.v2.search.expression("resource_type:image").execute(function(error, result) {
        console.log('result', result)
        // res.send(result)
        res.render('images', {imagesArr: result.resources})
    });
}

function resize(path, format, width, height) {
    const readStream = fs.createReadStream(path)

    let transform = sharp();
    if (format) {
        transform = transform.toFormat(format);
    }

    if (width || height) {
        transform = transform.resize(width, height)
        // console.log(transform)
    }
    return readStream.pipe(transform);

}
function imageFormat(input) {
    // convert to lower
    if (typeof input === 'string') {
        input = input.toLowerCase()
    }

    if (input.includes('jpeg') || input.includes('jpg')) {
        return 'jpg'
    } else if (input.includes('png')) {
        return 'png'
    } else {
        return 'jpg'
    }
}
function fullSeed(req, res) {
    // console.log('image id', publicImageId)
    // if global var is set, delete
    // if (publicImageId) {
    //     cloudinary.v2.api.delete_resources([publicImageId], function(error, result) {
    //         console.log('deleted')
    //          res.send(result)
    //     })
    // }
    let files = fs.readdirSync("./public/public-images/for-seeds")

    // loop over files
    function createPromises(files) {
        let arr = []
        files.forEach((file) => {
            console.log('file', file)
            // let file = `adorable-animal-canine-163685.jpg`
            let src = `./public/public-images/for-seeds/${file}`
            // add new image
            let promise = cloudinaryUploader(src)
            arr.push(promise)
            // console.log(promise)
        })
        return arr
    }
    function addToDb(promiseArr) {
        promiseArr.forEach((promise) => {

            promise.then(img => {
                console.log('img', img)
                publicImageId = img.public_id
                // add bucket src to Image
                let image = new Image({
                    filename: img.original_filename,
                    title: 'puppy image',
                    photographer: 'NA',
                    description: 'A seeded puppy',
                    src: img.secure_url,
                    contentType: img.format,
                    path: '400x400'
                })
                // remove all dogs everytime
                // Image.remove({}, () => {
                    let result = image.save()

                    result.then(image => {
                        console.log('saved')
                        // req.flash('success', 'Image Saved')
                        // res.send('saved')
                    }).catch(e => {
                        console.log(`image not saved, ${e}`)
                        req.flash('error', `Image not Saved: ${e}`);
                        res.redirect('single-seed')
                    })
                // })
            }).catch(err => {
                console.error('An error occured', err)
                res.send('An error at the end of the promise')
            })
        })
    }
    addToDb(createPromises(files))
    // let promises = files.map((file) => {
    //     console.log('file', file)
    //      let file = `adorable-animal-canine-163685.jpg`
    //     let src = `./public/public-images/for-seeds/${file}`
    //      add new image
    //     let promise = cloudinaryUploader(src)
    //      promise returned from cloudinary
    //     console.log('promise', promise)
    // promise.then(img => {
    //     console.log('img', img)
    //     publicImageId = img.public_id
    //     // add bucket src to Image
    //     let image = new Image({
    //         filename: file,
    //         title: 'puppy image',
    //         photographer: 'NA',
    //         description: 'A seeded puppy',
    //         src: img.secure_url,
    //         contentType: img.format,
    //         path: '400x400'
    //     })
    //     // remove all dogs everytime
    //     Image.remove({}, () => {
    //         let promise = image.save()
    //
    //         promise.then(image => {
    //             console.log('saved')
    //             // req.flash('success', 'Image Saved')
    //             // res.send('saved')
    //         }).catch(e => {
    //             console.log(`image not saved, ${e}`)
    //             req.flash('error', `Image not Saved: ${e}`);
    //             res.redirect('single-seed')
    //         })
    //     })
    // }).catch(err => {
    //     console.error('An error occured', err)
    //     res.send('An error at the end of the promise')
    // })

    // })
    // let allPromises = Promise.all(promises)
    // allPromises.then((results) => {
    //     console.log('all Promises', results)
    // })

}
function cloudinaryUploader(image) {
    return new Promise((resolve, reject) => {
        cloudinary.v2.uploader.upload(image, (error, result) => {
            if (error) {
                console.error('Error in the cloudinary loader', error)
                reject(error)
            } else {
                console.log('result', result)
                resolve(result)
            }
        })

    })
}
