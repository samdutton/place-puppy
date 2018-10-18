I'm trying to use mongo-connect in production but I'm not sure what is going wrong. My sessions do not expire. There is a fundamentals issue too as I am also not sure how the db store interacts with the cookies.

I'm trying this. Not sure if it's all set correct.

    app.use(session({
        secret: process.env.SECRET,
        store: new MongoStore({
            mongooseConnection: db,
            stringify: false    
        }),
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 60000 }
    }))

Later when the user logins in I add the user to the `req.session.user`. I do not have a sessions model, but one is created by connect-mongo.
I've added a blank Session model like this just so I can access the sessions collection.

    const mongoose = require('mongoose')
    const Schema = mongoose.Schema
    const Sessions = mongoose.model('sessions', new Schema())

Using this syntax:


    Sessions.find({}, (err, data) =>{
            console.log('data', data[0])
        })


The session appears like this:

    let data =   {
            "_id" : ":_eOVPqYsVf6Gr",
            "session" : {
                "cookie" : {
                    "originalMaxAge" : 60000,
                    "expires" : ISODate("2018-10-18T17:20:20.521Z"),
                    "secure" : null,
                    "httpOnly" : true,
                    "domain" : null,
                    "path" : "/",
                    "sameSite" : null
                },
                "flash" : {},
                "user" : {
                    "resetPasswordToken" : null,
                    "resetPasswordExpires" : null,
                    "_id" : ObjectId("82839193913130"),
                    "email" : "A&***T@YAHOO.COM",
                    "password" : "$HASHYfLV5qFuFHeHRaGZoPCaSgWlJleFueOwR2NwzcE2ZW",
                    "__v" : 0
                }
            },
            "expires" : ISODate("2018-10-18T17:20:20.643Z")
        }

Since the expiration is not working I am trying to manually query the db for each session user email, and try to manipulate the expiration that way, but `data.session' returns `undefined`.

I thought maybe I could add  
