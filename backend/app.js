require("dotenv").config();
var http = require("http"),
  path = require("path"),
  methods = require("methods"),
  express = require("express"),
  bodyParser = require("body-parser"),
  session = require("express-session"),
  cors = require("cors"),
  passport = require("passport"),
  errorhandler = require("errorhandler"),
  mongoose = require("mongoose");

var isProduction = process.env.NODE_ENV === "production";

// Create global app object
var app = express();

app.use(cors());

// Normal express config defaults
app.use(require("morgan")("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(require("method-override")());
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: "secret",
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false
  })
);

if (!isProduction) {
  app.use(errorhandler());
}

if (!process.env.MONGODB_URI) {
  console.warn("Missing MONGODB_URI in env, please add it to your .env file");
}

mongoose.connect(process.env.MONGODB_URI);
if (isProduction) {
} else {
  mongoose.set("debug", true);
}

require("./models/User");
require("./models/Item");
require("./models/Comment");
require("./config/passport");

app.use(require("./routes"));

const User = mongoose.model("User");
const Item = mongoose.model("Item");
const Comment = mongoose.model("Comment");


async function seedDatabase() {
  for (let i = 0; i < 100; i++) {
    // add user
    const user = { username: `user${i}`, email: `user${i}@gmail.com` };
    const options = { upsert: true, new: true };
    const createdUser = await User.findOneAndUpdate(user, {}, options);
    
    // add item to user
    const item = {
      slug: `slug${i}`,
      title: `title ${i}`,
      description: `description ${i}`,
      seller: createdUser,
    };
    const createdItem = await Item.findOneAndUpdate(item, {}, options);
    
    // add comments to item
    if (!createdItem?.comments?.length) {
      let commentIds = [];
      for (let j = 0; j < 100; j++) {
        const comment = new Comment({
          body: `body ${j}`,
          seller: createdUser,
          item: createdItem,
        });
        await comment.save();
        commentIds.push(comment._id);
      }
      createdItem.comments = commentIds;
      await createdItem.save();
    }
  }
}

seedDatabase()
  .then(() => {
  console.log("Finished DB seeding");
  process.exit(0);
})
.catch((err) => {
  console.log(`Error while running DB seed: ${err.message}`);
  process.exit(1);
});

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
  if (req.url === "/favicon.ico") {
    res.writeHead(200, { "Content-Type": "image/x-icon" });
    res.end();
  } else {
    const err = new Error("Not Found");
    err.status = 404;
    next(err);
  }
});

/// error handler
app.use(function(err, req, res, next) {
  console.log(err.stack);
  if (isProduction) {
    res.sendStatus(err.status || 500)
  } else {
    res.status(err.status || 500);
    res.json({
      errors: {
        message: err.message,
        error: err
      }
    });
  }
});

// finally, let's start our server...
var server = app.listen(process.env.PORT || 3000, function() {
  console.log("Listening on port " + server.address().port);
});
