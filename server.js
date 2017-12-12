var express = require("express");
var bodyParser = require("body-parser");
var cheerio = require("cheerio");
var mongoose = require("mongoose");
var request = require('request');
var path = require('path');
var exphbs = require("express-handlebars");

var db = require(path.resolve(__dirname, "./models"));
var PORT = 8080;

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(process.cwd() + '/public'));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost/onionNews", {
    useMongoClient: true
});

//function to scrape webpage for artilces and store to Database
app.get("/scrape", function(req, res) {

    request('http://time.com//', function(error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        // console.log('body:', body); // 
        var $ = cheerio.load(body);
        $(".home-brief-article").each(function(i, element) {
            var result = {};
            result.title = $(element).find("h2 > a").text();
            result.link = $(element).find("h2 > a").attr("href");
            result.excerpt = $(element).find("p").text();
            db.Article
                .create(result)
                .then(function(dbArticle) {
                    // If we were able to successfully scrape and save an Article, send a message to the client
                    res.send(result);
                })
                .catch(function(err) {
                    // If an error occurred, send it to the client
                    res.json(err);
                });
        });
    });
});

app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article
    .findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note
    .create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article
    .find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      var hbsObj = {articles: dbArticle}
      res.render("index", hbsObj);

    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
});