var sqlite3 = require('sqlite3').verbose()
var md5 = require('md5')

const DBSOURCE = "db.sqlite"

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        // Cannot open database
        console.error(err.message)
        throw err
    } else {
        console.log('Connected to the SQLite database.')
        db.run(`CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username text, 
            password text,
            nick text
            )`,
            (err) => {
                if (err) {
                    // Table already created
                    //console.log('Table creation error.');
                    //console.log(err)
                } else {
                    // Table just created, creating some rows
                    console.log('Table "user" created.');
                    var insert = 'INSERT INTO user (username, password, nick) VALUES (?,?,?)'
                    db.run(insert, ["admin", md5("admin123456"), "admin"])
                    db.run(insert, ["username", md5("password"), "username"])
                }
            });
        db.run(`CREATE TABLE latex(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id text,
            tex text,
            description text,
            FOREIGN KEY(user_id) REFERENCES user(id)
        )`,
            (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log('Table "latex" created.');
                }
            });
        db.run(`CREATE TABLE message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_id integer,
            to_id integer,
            latex_id integer,
            comment text,
            FOREIGN KEY(from_id) REFERENCES user(id),
            FOREIGN KEY(to_id) REFERENCES user(id),
            FOREIGN KEY(latex_id) REFERENCES latex(id)
        )`,
            (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log('Table "message" created.')
                }
            })
    }
});


module.exports = db