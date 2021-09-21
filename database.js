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
            password text 
            )`,
            (err) => {
                if (err) {
                    // Table already created
                    //console.log('Table creation error.');
                    //console.log(err)
                } else {
                    // Table just created, creating some rows
                    console.log('Table created.');
                    var insert = 'INSERT INTO user (username, password) VALUES (?,?)'
                    db.run(insert, ["admin", md5("admin123456")])
                    db.run(insert, ["username", md5("password")])
                }
            });
    }
});


module.exports = db