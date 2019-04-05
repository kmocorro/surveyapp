const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');

const apiController = require('./controllers/apiController');
const verifyLDAP = require('./controllers/verifyLDAP');

const port = process.env.PORT || 5050;

app.use('/', express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

app.use(cookieParser());

apiController(app);
verifyLDAP(app);


app.listen(port);
console.log('Survey app is running at ' + port + '...');