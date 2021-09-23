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
    var sql = 'INSERT INTO user (username, password, nick) VALUES(\'' + req.body.username + '\',\'' + md5(req.body.password) + '\',\'' + req.body.nick + '\')';
    db.run(sql, function(err, result) {
        //console.log('here234123');
        //console.log(err);
        if (err) {
            console.log(err);
            createHttpError(err);
            return;
        }
        res.redirect('/login');
    });

});

/* POST authenticate */
router.post('/authenticate', function(req, res, next) {
    //console.log('here45353');
    if (req.body.username.length > 0 && req.body.password.length > 0) {
        // intentionally vulnerable to SQLi
        var sql = 'SELECT * FROM user WHERE username = \'' + req.body.username + '\' and password = \'' + md5(req.body.password) + '\'';
        db.get(sql, [], function(err, result) {
            if (err) {
                console.error(err);
                createHttpError(err);
                return;
            } else {
                if (typeof result === 'undefined') {
                    res.redirect('/login');
                    return;
                }

                req.session.userid = result.id;
                req.session.username = result.username;
                req.session.nick = result.nick;
                res.redirect('/profile/' + req.session.userid);
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
                username: results.username,
                userid: req.params.userid
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

router.get('/upload/latex', function(req, res, next) {
    res.render('upload_latex');
})

router.post('/upload/latex', function(req, res, next) {
    var sql = 'INSERT INTO latex (user_id, tex, description) VALUES (?,?,?)';
    var values = [req.session.userid, req.body.latex, req.body.description];
    db.get(sql, values, function(err, row) {
        res.redirect('/profile/' + req.session.userid + '/latex');
    })
})

router.get('/profile/:userid/latex', function(req, res, next) {
    var sql = 'SELECT * FROM latex WHERE user_id = ?';
    db.all(sql, req.params.userid, function(err, rows) {
        console.log(rows);

        parseLatexRows(rows);
        res.render('profile_latex', {
            userid: req.session.userid,
            username: req.session.username,
            latex: rows
        })
    })
})

router.get('/profile/:userid/message', function(req, res, next) {
    if (req.session.userid != req.params.userid) {
        res.redirect('/login');
        return;
    }
    var sql = 'SELECT * FROM user WHERE id != ?';
    var values = [req.session.userid];
    db.all(sql, values, function(user_err, user_rows) {
        if (user_err) {
            console.error(user_err);
        }
        sql = 'SELECT * FROM latex WHERE user_id = ?';
        values = [req.session.userid];
        db.all(sql, values, function(latex_err, latex_rows) {
            if (user_err) {
                console.error(latex_err);
            }

            parseLatexRows(latex_rows);

            res.render('message', {
                from_id: req.session.userid,
                user: user_rows,
                latex: latex_rows
            });
        })
    })
})

router.post('/profile/message', function(req, res, next) {
    var sql = 'INSERT INTO message (from_id, to_id, latex_id, comment) values (?,?,?,?)';
    var values = [req.body.from_id, req.body.to_id, req.body.latex_id, req.body.comment];
    db.get(sql, values, function(err, row) {
        res.redirect('/profile/' + req.body.from_id);
    })
})

router.get('/profile/:userid/messages', function(req, res, next) {
    if (req.session.userid != req.params.userid) {
        res.redirect('/login');
        return;
    }
    var messages = [];

    var sql = `
        SELECT message.id,
        message.comment,
        message.from_id,
        from_user.username as from_username,
        from_user.nick as from_nick,
        message.to_id,
        to_user.username as to_user,
        to_user.nick as to_nick,
        latex.tex,
        latex.description
        FROM message
        JOIN user from_user
            ON message.from_id = from_user.id
        JOIN user to_user
            ON message.to_id = to_user.id
        JOIN latex
            ON message.latex_id = latex.id
        WHERE message.from_id = ? OR message.to_id = ?`;

    sql = sql.replace(/[\r\n]+/gm, "");
    var values = [req.params.userid, req.params.userid];

    db.each(sql, values, function(err, row) {
        // runs for each row
        messages.push({
            message_id: row.id,
            comment: row.comment,
            sent: (Number(req.params.userid) === row.from_id),
            recieved: (Number(req.params.userid) === row.to_id),
            from_username: row.from_username,
            from_nick: row.from_nick,
            to_username: row.to_user,
            to_nick: row.to_nick,
            tex: parseLatex(row.tex),
            description: row.description
        })

    }, function(err, number) {
        // runs after all row callbacks
        if (err) console.error(err);
        res.render('view_messages', {
            userid: req.session.userid,
            title: req.session.username,
            message_array: messages
        });
    });
})

function parseLatexRows(rows) {
    for (let i = 0; i < rows.length; i++) {
        rows[i].tex = parseLatex(rows[i].tex);
    }
}

function parseLatex(tex) {
    var html = '';
    try {
        html = katex.renderToString(tex);
    } catch (e) {
        if (e instanceof katex.ParseError) {
            // KaTeX can't parse the expression
            html = ("Error in LaTeX '" + texString + "': " + e.message)
                //.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                // uncomment above to stop XSS in LaTeX
        } else {
            throw e; // other error
        }
    }
    return html;
}

module.exports = router;