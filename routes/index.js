var express = require('express');
const createHttpError = require('http-errors');
const md5 = require('md5');
var router = express.Router();
var db = require('../database.js');
const katex = require('katex');

/* GET home page. */
router.get('/', function(req, res, next) {
    var isAuthenticated = !(req.session.userid === undefined);

    //katex test
    var test = katex.renderToString("\\text{Let }\\varepsilon < 0.");

    //console.log('userid = ' + req.session.userid);
    //console.log('isAuthenticated = ' + isAuthenticated);
    res.render('index', {
        unauthenticated: !isAuthenticated,
        title: req.query.name,
        userid: req.session.userid,
        latex: test
    });

});

/* GET login page. */
router.get('/login', function(req, res, next) {
    res.render('login');
});

/* GET new user registration page. */
router.get('/register', function(req, res, next) {
    res.render('register');
});

/* POST register user. */
router.post('/register', function(req, res, next) {
    var errors = [];
    if (!req.body.username) {
        errors.push("No username specified.");
        return;
    }
    if (!req.body.password) {
        errors.push("No password specified.");
        return;
    }
    if (errors.length) {
        res.status(400).json({ "error": errors.join(",") });
        return;
    }

    // intentionally vulnerable to SQLi
    var sql = 'INSERT INTO user (username, password) VALUES(\'' + req.body.username + '\',\'' + md5(req.body.password) + '\')';
    db.run(sql, function(err, result) {
        console.log('here234123');
        console.log(err);
        if (err) {
            console.log('here3485938');
            createHttpError(err);
            return;
        }

    });

});

/* POST authenticate */
router.post('/authenticate', function(req, res, next) {
    console.log('here45353');
    if (req.body.username.length > 0 && req.body.password.length > 0) {
        // intentionally vulnerable to SQLi
        var sql = 'SELECT * FROM user WHERE username = \'' + req.body.username + '\' and password = \'' + md5(req.body.password) + '\'';
        db.get(sql, [], function(err, result) {
            if (err) {
                console.error(err);
                createHttpError(err);
                return;
            } else {

                req.session.userid = result.id;
                req.session.username = result.username;
                res.redirect('/');
            }
        })
    }
})

router.get('/profile/:userid', function(req, res, next) {
    var sql = 'SELECT * FROM user WHERE id = ' + req.params.userid;
    db.get(sql, [], function(err, results) {
        if (err) {
            console.error(err);
            createHttpError(err);
            return;
        } else {
            res.render('profile', {
                username: results.username
            });
        }
    })
});

router.get('/profile', function(req, res, next) {
    if (req.session.userid) {
        res.redirect('/profile/' + req.session.userid);
    } else {
        res.redirect('/login');
    }
})

router.get('/logout', function(req, res, next) {
    req.session.destroy(function(err) {
        res.redirect('/');
    });
})

module.exports = router;