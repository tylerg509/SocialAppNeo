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

// birthplace add connect route
app.post('/person/born/add', (req, res) => {
    const name = req.body.name;
    const city = req.body.city;
    const state = req.body.state;
    const year = req.body.year;
    const session = driver.session()

    session
        .run("MATCH(a: Person {name: $nameParam}), (b:Location {city:$cityParam, state: $stateParam}) MERGE(a)-[r:Born_In {year:$yearParam}]->(b) RETURN a,b", {nameParam: name, cityParam:city, stateParam: state,  yearParam: year} )
        .then((result) => {
            res.redirect('/')
            session.close()
        })
        .catch((error) => {
            console.log(error)
        })
})

// person route
app.get('/person/:id', (req,res) => {
    const id = req.params.id;
    const session = driver.session()

    session
        .run("MATCH(a: Person) WHERE id(a)=toInteger($idParam) RETURN a.name as name", {idParam: id})
        .then((result) => {
            const name = result.records[0].get("name");

            session
                .run("OPTIONAL MATCH (a:Person)-[r:Born_In]-(b:Location) WHERE id(a)=toInteger($idParam) RETURN b.city as city, b.state as state", {idParam: id})
                .then((result2) => {
                    const city = result2.records[0].get("city");
                    const state = result2.records[0].get("state");

                    session
                    .run("OPTIONAL MATCH (a: Person)-[r: friends]-(b:Person) WHERE id(a)=toInteger($idParam) RETURN b", {idParam: id} )
                    .then((result3) => {
                        const friendsArr = [];
                        result3.records.forEach(item => {
                            if(item._fields[0] != null) {
                                friendsArr.push({
                                    id: records._fields[0].identity.low,
                                    name: records._fields[0].properties.name
                                })
                            }
                        })
    
                        res.render('person', {
                            id: id,
                            name: name,
                            city: city,
                            state: state,
                            friends: friendsArr
                        })
    
                        session.close()
                    })
                    .catch((err) => {
                        console.log(err)
                    })
                })




        })
})

app.listen(3000)

console.log(
    ' server started on port 3000'
)

module.exports = app;