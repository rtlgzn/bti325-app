/**********************************************************************************
 *  BTI325 – Assignment 6* I declare that this assignment is my own work in accordance with Seneca Academic Policy.
 * * No part of this assignment has been copied manually or electronically from any other source*
 *  (including web sites) or distributed to other students.**
 *  Name: Renata Toleugazina
 * Student ID: 125098228
 * Date: Dec 7 2023
 *** Online (Cyclic) URL:  https://clean-knickers-newt.cyclic.app/
 *********************************************************************************/



const authData = require('./authservice.js')
const clientSessions = require("client-sessions")
const stripJs = require('strip-js');
const multer = require("multer");
const cloudinary = require('cloudinary').v2
const streamifier = require('streamifier')
const express = require('express');
const app = express();
const path = require('path');
const HTTP_PORT = process.env.PORT || 8080;
const blogService = require('./blog-service.js');
const exphbs = require('express-handlebars');

app.use(express.urlencoded({ extended: true }));

app.engine('hbs', exphbs.engine({
    extname: '.hbs',
    helpers: {
        navLink: function (url, options)
        {
            return '<li' +
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') +
                '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options)
        {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue)
            {
                return options.inverse(this);
            } else
            {
                return options.fn(this);
            }
        },
        safeHTML: function (context)
        {
            return stripJs(context);
        },
        formatDate: function(dateObj){
            let year = dateObj.getFullYear();
            let month = (dateObj.getMonth() + 1).toString();
            let day = dateObj.getDate().toString();
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
        }
    }
}));
app.set('view engine', 'hbs');

function ensureLogin  (req, res, next) {
    if (!req.session.user) {
      res.redirect('/login');
    } else {
      next();
    }
}
cloudinary.config({
  cloud_name: 'dxetbauyx',
  api_key: '646543674724467',
  api_secret: 'niXD3n30lziZyvhFR0Yq7Q9DlV4',
  secure: true
});
const upload = multer(); 

app.use(express.static('public'));

app.use(
    clientSessions({
      cookieName: 'session',
      secret: 'o6LjQ5EVNC28ZgK64hDELM18ScpFQr', 
      duration: 2 * 60 * 1000, 
      activeDuration: 1000 * 60, 
    })
  );

  app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
  });


app.use(function(req,res,next){
  let route = req.path.substring(1);
  app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
  app.locals.viewingCategory = req.query.category;
  next();
});

app.get('/', (req, res) => {
    res.redirect('/blog');
});


app.get('/about', (req, res) => {
    res.render('about');
});


app.get('/posts/add', ensureLogin, async (req, res) => {
    try {
        const categories = await blogService.getCategories();
        res.render('addPost', { categories: categories });
    } catch (error) {
        res.render('addPost', { categories: [] });
    }
});

app.post('/posts/add', upload.single("featureImage"), ensureLogin, (req, res) => {
  let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream(
              (error, result) => {
              if (result) {
                  resolve(result);
              } else {
                  reject(error);
              }
              }
          );
  
          streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
  };
  
  async function upload(req) {
      let result = await streamUpload(req);
      console.log(result);
      return result;
  }
  
  upload(req).then(async (uploaded)=>{
      req.body.featureImage = uploaded.url;
  
      try {
          const newPost = await blogService.addPost(req.body);
          res.redirect('/posts');
        } 
        catch (error) {
          res.status(500).send('Error adding post: ' + error.message);
        }
  });

});

app.get('/blog', async (req, res) => {

  let viewData = {};

  try{

      let posts = [];

      if(req.query.category){
          posts = await blogService.getPublishedPostsByCategory(req.query.category);
      }else{
          posts = await blogService.getPublishedPosts();
      }

      posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

      let post = posts[0]; 

      viewData.posts = posts;
      viewData.post = post;

  }catch(err){
      viewData.message = "no results";
  }

  try{
      let categories = await blogService.getCategories();

      viewData.categories = categories;
  }catch(err){
      viewData.categoriesMessage = "no results"
  }

  res.render("blog", {data: viewData})

});


app.get('/blog/:id', async (req, res) => {

  let viewData = {};

  try{

      let posts = [];

      if(req.query.category){
          posts = await blogService.getPublishedPostsByCategory(req.query.category);
      }else{
          posts = await blogService.getPublishedPosts();
      }

      posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

      viewData.posts = posts;

  }catch(err){
      viewData.message = "no results";
  }

  try{
      viewData.post = await blogService.getPostById(req.params.id);
  }catch(err){
      viewData.message = "no results"; 
  }

  try{
      let categories = await blogService.getCategories();

      viewData.categories = categories;
  }catch(err){
      viewData.categoriesMessage = "no results"
  }

  res.render("blog", {data: viewData})
});


app.get('/posts', ensureLogin, (req, res) => {
  if (req.query.category) {
      blogService.getPostsByCategory(req.query.category)
          .then((result) => res.render('posts', { posts: result }))
          .catch((err) => res.send({ "message:": err }));
  } else if (req.query.minDate) {
      blogService.getPostsByMinDate(req.query.minDate)
          .then((result) => res.render('posts', { posts: result }))
          .catch((err) => res.send({ "message:": err }));
  } else {
      blogService.getAllPosts()
          .then((data) => res.render('posts', { posts: data }))
          .catch((err) => res.send({ message: "no results" }))
  }
});

app.get('/posts/:value', ensureLogin, (req, res) =>
{
    serv.getPostById(req.params.value)
        .then(result => res.send(result))
        .catch(err => res.send({ "message": err }))
});
  

app.get('/categories', (req, res) => {
  blogService.getCategories()
      .then((data) => res.render('categories', { categories: data }))
      .catch((err) => res.render("categories", { message: "no results" }));
});



app.get('/categories', ensureLogin, (req, res) => {
  blogService.getCategories().then(categories => {
      res.json(categories);
    }).catch(error => {
      res.status(404).json({ message: error });
    });
});

app.get('/categories/add', (req, res) => {
    res.render('addCategory');
  });
  
  app.post('/categories/add', async (req, res) => {
    try {
      const result = await blogService.addCategory(req.body);
      res.redirect('/categories');
    } catch (error) {
      res.status(500).send('Unable to create category');
    }
  });
  
  app.get('/categories/delete/:id', async (req, res) => {
    try {
      const result = await blogService.deleteCategoryById(req.params.id);
      res.redirect('/categories');
    } catch (error) {
      res.status(500).send('Unable to Remove Category / Category not found');
    }
  });
  
  app.get('/posts/delete/:id', async (req, res) => {
    try {
        const result = await blogService.deletePostById(req.params.id);
        res.redirect('/posts');
    } catch (error) {
        res.status(500).send('Unable to Remove Post / Post not found');
    }
});

app.get('/categories/add', ensureLogin, (req, res) =>
{
    res.render('addCategory', {body: 'addCategory'});
});

app.post('/categories/add', ensureLogin, (req, res) =>
{
    serv.addCategory(req.body).then(() => res.redirect('/categories'))
});

app.get('/categories/delete/:id', ensureLogin, (req, res) =>
{
    serv.deleteCategoryById(req.params.id).then(() => res.redirect('/categories')).catch(() => res.status(500).send('Unable to Remove Category / Category not found'))
});

app.get('/posts/delete/:id', ensureLogin, (req, res) =>
{
    serv.deletePostById(req.params.id).then(() => res.redirect('/posts')).catch(() => res.status(500).send('Unable to Remove Post / Post not found'))
});

app.get('/login', (req, res) =>
{
    res.render('login');
});

app.get('/register', (req, res) =>
{
    res.render('register');
});

app.post('/register', (req, res) =>
{
    authData.registerUser(req.body).then((data) =>
    {
        res.render('register', { successMessage: "User created" })
    }).catch(err =>
    {
        res.render('register', {errorMessage: err, userName: req.body.userName} )
    })
});

app.post('/login', (req, res) =>
{

    req.body.userAgent = req.get('User-Agent');

    authData.checkUser(req.body).then((user) => {
        req.session.user = {
            userName: user.userName,
            email: user.email,
            loginHistory: user.loginHistory
        }
        res.redirect('/posts');
    }).catch(err =>
    {
        res.render('login', {errorMessage: err, userName: req.body.userName})
    })
    
});

app.get('/logout', (req, res) =>
{
    req.session.reset();
    res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) =>
{
    res.render('userHistory');
});


app.use((req, res) => {
  res.status(404).send("Code not working dude");
});


blogService.initialize().then(authData.initialize).then(function(){
    app.listen(HTTP_PORT, function(){
        console.log("app listening on: " + HTTP_PORT)
    });
}).catch(function(err){
    console.log("unable to start server: " + err);
});

