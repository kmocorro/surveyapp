let jwt = require('jsonwebtoken');
let config = require('../config').authSecret;
let formidable = require('formidable');
let mysql = require('../config').pool;

let passport = require('passport');
let LdapStrategy = require('passport-ldapauth');
let ldap = require('../config').ldap_config;

module.exports = function(app){

    // api to verify account :3
    app.post('/api/login', function(req, res){
        let form = new formidable.IncomingForm();

        form.parse(req, function(err, fields){
            if(err){return res.send({err: 'Form parse error.'})};

            //console.log(fields);
            
            if(fields){
                let form_login_details = fields;

                if(form_login_details.authenticity_token && form_login_details.username && form_login_details.password){

                    // verify authenticity_token from fields
                    let token = fields.authenticity_token;

                    if(!token){
                        res.send({err: 'Invalid login'});
                    } else {

                        // check ifTokenValid
                        function isTokenValid(){
                            return new Promise(function(resolve, reject){

                                jwt.verify(token, config.secret, function(err, decoded){
                                    if(err){ reject('Expired') };

                                    let isSignUpValidToken = decoded.claim;

                                    if(isSignUpValidToken.signup == 'valid'){
                                        resolve();
                                    } else {
                                        let invalidToken = 'Expired';
                                        reject(invalidToken);
                                    }

                                });

                            });
                        }

                        isTokenValid().then(function(){

                            let credentials = {
                                username: form_login_details.username,
                                pass: form_login_details.password
                            };

                            let OPTS = {
                                server: {
                                    url: ldap.url,
                                    bindDN: ldap.bindUser,
                                    bindCredentials: ldap.bindPass,
                                    searchFilter: '(sAMAccountName={{username}})',
                                    searchBase: ldap.searchBase,
                                    connectionTimeout: ldap.connectionTimeout
                                },
                                credentialsLookup: function(){
                                    return { username: credentials.username , password: credentials.pass };
                                }
                            };
                        
                            let strategy = new LdapStrategy(OPTS);
                            passport.use(strategy);
                            passport.initialize();
                            

                            res.render('index', passport.authenticate('ldapauth', function(err, user, info){
                                if(err){
                                    res.send({err: 'This is an error ' +err});
                                } else if(!user){
                                    res.send({err: info.message});
                                } else {

                                    /** Verify account */
                                    function validate_headcount(){
                                        return new Promise(function(resolve, reject){

                                            mysql.getConnection(function(err, connection){
                                                if(err){return reject(err)};

                                                connection.query({
                                                    sql: 'SELECT * FROM tbl_employee_hc WHERE upload_date = (SELECT MAX(upload_date) FROM tbl_employee_hc) AND employee_number = ?',
                                                    values: [user.employeeNumber]
                                                },  function(err, results){
                                                    if(err){return reject(err)};

                                                    

                                                    if(typeof results[0] !== 'undefined' && results[0] !== null && results.length > 0){
                                                        let access = {
                                                            pass : true,
                                                            employeeNumber: results[0].employee_number,
                                                            shift: results[0].shift,
                                                            department: results[0].department
                                                        }

                                                        resolve(access);

                                                    } else {

                                                        let access = {
                                                            pass: false
                                                        };

                                                        resolve(access);

                                                    }

                                                });

                                                connection.release();

                                            });

                                        });
                                    }

                                    validate_headcount().then(function(access){

                                        if(access.pass){
                                            
                                            let nickName_array = (user.displayName).split(" ");
                                            let nickName = nickName_array[0];
        
                                            let token = jwt.sign({
                                                id: user.employeeID, // diff from employeeNumber
                                                claim: {
                                                    employeeNumber: user.employeeNumber,
                                                    displayName: nickName,
                                                    givenName: user.displayName,
                                                    title: user.title,
                                                    department: user.department,
                                                    username: user.sAMAccountName,
                                                    shift: access.shift,
                                                    department_hc: access.department
                                                }
        
                                            }, config.secret);
        
                                            res.cookie('auth_survey_login_cookie', token);
                                            res.status(200).send({auth: 'Authenticated'});

                                        } else {
                                            res.send({err: 'Sorry, only FAB4 employees are allowed to participate.'});
                                        }

                                    });

                                    

                                }

                            }));

                        }, function(err){
                            if(err){return res.send({err: err + ' token. Refresh the page and try logging in again.'})};
                        });


                    }

                }

            } else {
                res.send({err: 'No fields found'});
            }


        });


    });

}