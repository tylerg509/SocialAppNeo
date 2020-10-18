const express = require('express')
const path = require('path')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const neo4j = require('neo4j-driver')
const local = require('./local')

const app = express();

// view js will be view engine 
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic(local.user, local.password))
const session = driver.session()

// home route
app.get('/', (req, res) => {
    session
        .run("MATCH (n: Person) RETURN n")
        .then((result) => {
            let personArr = []
            result.records.forEach( item => {
                console.log(item._fields[0])
                personArr.push({
                    id: item._fields[0].identity.low,
                    name: item._fields[0].properties.name
                })
            })
            res.render('index', {
                persons: personArr
            })

        })
        .catch( err => {
            console.log(err)
        })
        
})

app.listen(3000)

console.log(
    ' server started on port 3000'
)

module.exports = app;