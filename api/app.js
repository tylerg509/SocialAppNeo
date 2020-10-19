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

// home route
app.get('/', (req, res) => {
    const session = driver.session()

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

            session
                .run("MATCH (n:Location) RETURN n")
                .then((result2) => {
                    let locationArr = [];
                    result2.records.forEach(item =>{
                        locationArr.push(item._fields[0].properties)
                    })

                    res.render('index', {
                        persons: personArr,
                        locations: locationArr
                    })
                })
                .catch(err => {
                    console.log(err)
                })

        })
        .catch( err => {
            console.log(err)
        })
        
})

// add person route
app.post('/person/add', (req, res) => {
    const name = req.body.name;
    const session = driver.session()

    session
        .run("CREATE(n:Person {name: $nameParam}) RETURN n.name", {nameParam:name})
        .then((result) => {
            res.redirect('/')
            session.close()
        })
        .catch((error) => {
            console.log(error)
        })
})

// add location route
app.post('/location/add', (req, res) => {
    const city = req.body.city;
    const state = req.body.state;
    const session = driver.session()

    session
        .run("CREATE(n:Location {city: $cityParam, state: $stateParam}) RETURN n", {cityParam:city, stateParam: state})
        .then((result) => {
            res.redirect('/')
            session.close()
        })
        .catch((error) => {
            console.log(error)
        })
})

// friends connect route
app.post('/friends/connect', (req, res) => {
    const name1 = req.body.name1;
    const name2 = req.body.name2;
    const session = driver.session()

    session
        .run("MATCH(a: Person {name: $nameParam1}), (b:Person {name:$nameParam2}) MERGE(a)-[r:Friends]->(b) RETURN a,b", {nameParam1: name1, nameParam2:name2} )
        .then((result) => {
            res.redirect('/')
            session.close()
        })
        .catch((error) => {
            console.log(error)
        })
})


app.listen(3000)

console.log(
    ' server started on port 3000'
)

module.exports = app;