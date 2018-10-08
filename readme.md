
## Placepuppy
### An image placeholder api

[place-puppy.com](http://place-puppy.com)

Use this this api to deliver placholder images to your projects in developement.

Use the url to call images of any size

`place-puppy.com/300x300`

##### features
To request a certain grade of image insert a query string int into the url using `high`, `good`, `eco`, or `low`.
```
https://place-puppy.com/200x200?q=eco
```
You can request either the file type `png`, `jpg`, or `gif`.
```
https://place-puppy.com/f=png
```
With the quality included
```
https://place-puppy.com?f=png&q=high
```
