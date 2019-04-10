let formidable = require('formidable');
let XLSX = require('xlsx');
let moment = require('moment');
let mysql = require('../config').pool;
let uuidv4 = require('uuid/v4');
let jwt = require('jsonwebtoken');


let config = require('../config').authSecret;
let verifyToken = require('../controllers/verifyToken');

module.exports = function(app){

    app.get('/login', function(req, res){

        let authenticity_token = jwt.sign({
            id: uuidv4(),
            claim: {
                signup: 'valid'
            }
        }, config.secret);

        res.render('login', {authenticity_token});

    });

    app.get('/logout', function(req, res){

        res.cookie('auth_survey_login_cookie', null);
        res.redirect('/');

    });

    app.get('/thankyou', function(req, res){
        res.cookie('auth_survey_login_cookie', null);
        res.render('thankyou');
    })

    app.get('/', verifyToken, function(req, res){

        let canteen_form_list = [
            {name: 'css_q1', question:'Overall quality of the food in the canteen'},
            {name: 'css_q2', question:'Variety of food/menu provided'},
            {name: 'css_q3', question:'Food serving/portions served'},
            {name: 'css_q4', question:'Price of food per serving'},
            {name: 'css_q5', question:'Food taste'},
            {name: 'css_q6', question:'Enough bottled and in can drinks'},
            {name: 'css_q7', question:'Enough amount and variety of snacks'},
            {name: 'css_q8', question:'Courtesy/service of canteen crew'},
            {name: 'css_q9', question:'On time response of canteen crew'},
            {name: 'css_q10', question:'Canteen crew is helpful '},
            {name: 'css_q11', question:'Table and chairs in the cafeteria were clean'},
            {name: 'css_q12', question:'Plates, glasses, spoon and fork are enough'},
            {name: 'css_q13', question:'Overall cleanliness of canteen'},
            {name: 'css_q14', question:'Management of line queuing'},
            {name: 'css_q15', question:'Overall canteen ambiance'},
            {name: 'css_qsub1', question:'What is it you like best about the canteen?'},
            {name: 'css_qsub2', question:'What is it you like least about the canteen?'},
            {name: 'css_qsub3', question:'Other Comments/Suggestions:'}
        ];

        let shuttle_form_list = [
            {name: 'sss_q1', question: 'Driver implements "NO ID NO ENTRY" policy'},
            {name: 'sss_q2', question: 'Bus/shuttle has complete and functioning seatbelts'},
            {name: 'sss_q3', question: 'Driver follows traffic rules and regulations (eg. speed limit, proper loading/unloading zones, stoplights, etc'},
            {name: 'sss_q4', question: 'Driver does not use mobile devices while driving'},
            {name: 'sss_q5', question: 'Pick-up point is safe for waiting'},
            {name: 'sss_q6', question: 'Shuttle is at the designated pick-up point at the right time'},
            {name: 'sss_q7', question: 'Shuttle signage is clear, visible, and easily located'},
            {name: 'sss_q8', question: 'Aircon is working properly'},
            {name: 'sss_q9', question: 'Shuttle is always clean'},
            {name: 'sss_q10', question: 'Trashcan is available '},
            {name: 'sss_q11', question: 'Bus/shuttle manifest is always prepared, readily available, and all details are filled out.'},
            {name: 'sss_q12', question: 'Driver helps ensure that priority seating is followed for employees who are pregnant and disabled'},
            {name: 'sss_q13', question: 'Driver promotes on-time pick-up in designated pick-up points'},
            {name: 'sss_q14', question: 'Driver shows dedication and is familiar with the assigned routes'},
            {name: 'sss_q15', question: 'Driver talks politely, is good mannered and does not raise his voice.'},
            {name: 'sss_qsub1', question: 'What is it you like best about the shuttle?'},
            {name: 'sss_qsub2', question: 'What is it you like least about the shuttle?'},
            {name: 'sss_qsub3', question: 'Other Comments/Suggestions:'}
        ]

        let shuttle_route_list = [
            'ALABANG',
            'BALIBAGO',
            'TAGAPO',
            'CALAMBA',
            'MAYAPA',
            'TANAUAN',
            'SAN PEDRO',
            'PALA-PALA',
            'MAMATID',
            'PULO',
        ]

        if(req.userID && req.claim){

            let user_details = {
                employeeNumber: req.claim.employeeNumber,
                username: req.claim.username,
                displayName: req.claim.displayName,
                givenName: req.claim.givenName,
                title: req.claim.title,
                department: req.claim.department_hc,
                shift: req.claim.shift
            }

            function validateParticipants(){
                return new Promise(function(resolve, reject){

                    mysql.getConnection(function(err, connection){
                        if(err){return reject(err)};

                        connection.query({
                            sql: 'SELECT * FROM tbl_survey_participants WHERE employee_number = ?',
                            values: [user_details.employeeNumber]
                        },  function(err, results){
                            if(err){return reject(err)};
                            if(typeof results[0] !== 'undefined' && results[0] !== null && results.length > 0){
                                let canteen_and_shuttle_forms = false;

                                resolve(canteen_and_shuttle_forms)
                            } else {
                                let canteen_and_shuttle_forms = true;

                                resolve(canteen_and_shuttle_forms);
                            }
                        });

                        connection.release();


                    });

                });
            }

            validateParticipants().then(function(canteen_and_shuttle_forms){
                res.render('index', {canteen_form_list, shuttle_form_list,shuttle_route_list, user_details, canteen_and_shuttle_forms});
            },  function(err){
                res.send({err: err});
            })
    
            
        }


    });

    app.post('/api/canteen_and_shuttle_survey', verifyToken, function(req, res){
        let form = new formidable.IncomingForm();

        form.parse(req, function(err, fields){
            if(err){return res.send({err: err})};

            if(fields){
                let submit_date = new Date();

                let form_details = {
                    css_q1: fields.css_q1,
                    css_q2: fields.css_q2,
                    css_q3: fields.css_q3,
                    css_q4: fields.css_q4,
                    css_q5: fields.css_q5,
                    css_q6: fields.css_q6,
                    css_q7: fields.css_q7,
                    css_q8: fields.css_q8,
                    css_q9: fields.css_q9,
                    css_q10: fields.css_q10,
                    css_q11: fields.css_q11,
                    css_q12: fields.css_q12,
                    css_q13: fields.css_q13,
                    css_q14: fields.css_q14,
                    css_q15: fields.css_q15,
                    css_qsub1: fields.css_qsub1,
                    css_qsub2: fields.css_qsub2,
                    css_qsub3: fields.css_qsub3,
                    shuttle_route: fields.shuttle_route,
                    shuttle_bus_marshall: fields.shuttle_bus_marshall,
                    sss_q1: fields.sss_q1,
                    sss_q2: fields.sss_q2,
                    sss_q3: fields.sss_q3,
                    sss_q4: fields.sss_q4,
                    sss_q5: fields.sss_q5,
                    sss_q6: fields.sss_q6,
                    sss_q7: fields.sss_q7,
                    sss_q8: fields.sss_q8,
                    sss_q9: fields.sss_q9,
                    sss_q10: fields.sss_q10,
                    sss_q11: fields.sss_q11,
                    sss_q12: fields.sss_q12,
                    sss_q13: fields.sss_q13,
                    sss_q14: fields.sss_q14,
                    sss_q15: fields.sss_q15,
                    sss_qsub1: fields.sss_qsub1,
                    sss_qsub2: fields.sss_qsub2,
                    sss_qsub3: fields.sss_qsub3
                }

                if(!fields.anonymous_submission){ // save emp credentials
                    //console.log('Hello non-anon');
                    let user_details = {
                        employeeNumber: req.claim.employeeNumber,
                        username: req.claim.username,
                        displayName: req.claim.displayName,
                        givenName: req.claim.givenName,
                        title: req.claim.title,
                        department: req.claim.department_hc,
                        shift: req.claim.shift
                    }

                    function participantsList(){
                        return new Promise(function(resolve, reject){

                            mysql.getConnection(function(err, connection){
                                if(err){return reject(err)};

                                connection.query({
                                    sql: 'INSERT INTO tbl_survey_participants SET employee_number = ? , shift = ? , department = ?, date_time = ?',
                                    values: [user_details.employeeNumber, user_details.shift, user_details.department, submit_date]
                                },  function(err, results){
                                    if(err){return reject(err)};
                                    resolve();
                                });

                                connection.release();
                            });

                        });
                    }

                    function insertCanteenSurvey(){
                        return new Promise(function(resolve, reject){
                            
                            mysql.getConnection(function(err, connection){
                                if(err){return reject(err)};

                                connection.query({
                                    sql: 'INSERT INTO tbl_canteen_survey SET css_q1 =?, css_q2 =?, css_q3 =?, css_q4 =?, css_q5 =?, css_q6 =?, css_q7 =?, css_q8 =?, css_q9 =?, css_q10 =?, css_q11 =?, css_q12 =?, css_q13 =?, css_q14 =?, css_q15 =?, css_qsub1 =?, css_qsub2 =?,css_qsub3 =?, employee_number = ?, shift =?, department =?, date_time =?',
                                    values: [
                                        form_details.css_q1,
                                        form_details.css_q2,
                                        form_details.css_q3,
                                        form_details.css_q4,
                                        form_details.css_q5,
                                        form_details.css_q6,
                                        form_details.css_q7,
                                        form_details.css_q8,
                                        form_details.css_q9,
                                        form_details.css_q10,
                                        form_details.css_q11,
                                        form_details.css_q12,
                                        form_details.css_q13,
                                        form_details.css_q14,
                                        form_details.css_q15,
                                        form_details.css_qsub1,
                                        form_details.css_qsub2,
                                        form_details.css_qsub3,
                                        user_details.employeeNumber,
                                        user_details.shift,
                                        user_details.department,
                                        submit_date
                                    ]
                                },  function(err, results){
                                    if(err){return reject(err)};

                                    //console.log(results);
                                    resolve();
                                });

                                connection.release();

                            });

                        });
                    }

                    function insertShuttleSurvey(){
                        return new Promise(function(resolve, reject){
                            
                            mysql.getConnection(function(err, connection){
                                if(err){return reject(err)};

                                connection.query({
                                    sql: 'INSERT INTO tbl_shuttle_survey SET shuttle_route = ?, shift =?, shuttle_bus_marshall = ?, sss_q1 = ?, sss_q2 = ?, sss_q3 = ?, sss_q4 = ?, sss_q5 = ?, sss_q6 = ?, sss_q7 = ?, sss_q8 = ?, sss_q9 = ?, sss_q10 = ?, sss_q11 = ?, sss_q12 = ?, sss_q13 = ?, sss_q14 = ?, sss_q15 = ?, sss_qsub1 =?, sss_qsub2 =?, sss_qsub3 =?, employee_number = ?, department =?, date_time =?',
                                    values: [
                                        form_details.shuttle_route,
                                        user_details.shift,
                                        form_details.shuttle_bus_marshall,
                                        form_details.sss_q1,
                                        form_details.sss_q2,
                                        form_details.sss_q3,
                                        form_details.sss_q4,
                                        form_details.sss_q5,
                                        form_details.sss_q6,
                                        form_details.sss_q7,
                                        form_details.sss_q8,
                                        form_details.sss_q9,
                                        form_details.sss_q10,
                                        form_details.sss_q11,
                                        form_details.sss_q12,
                                        form_details.sss_q13,
                                        form_details.sss_q14,
                                        form_details.sss_q15,
                                        form_details.sss_qsub1,
                                        form_details.sss_qsub2,
                                        form_details.sss_qsub3,
                                        user_details.employeeNumber,
                                        user_details.department,
                                        submit_date
                                    ]
                                },  function(err, results){
                                    if(err){return reject(err)};

                                    //console.log(results);
                                    resolve();
                                });

                                connection.release();

                            });

                        });
                    }

                    insertCanteenSurvey().then(function(){
                        return insertShuttleSurvey().then(function(){
                            return participantsList().then(function(){
                                
                                res.send({auth: 'Saved'});

                            },  function(err){
                                res.send({err: 'ERR' + err});
                            });
                        },  function(err){
                            res.send({err: 'ERR' + err});
                        });
                    },  function(err){
                        res.send({err: 'ERR' + err});
                    });


                } else { // use shift and dept instead
                    //console.log('Hello anon');
                    let participant_employee_number = req.claim.employeeNumber;

                    let user_details = {
                        employeeNumber: 0,
                        department: req.claim.department_hc,
                        shift: req.claim.shift
                    }

                    function participantsList(){
                        return new Promise(function(resolve, reject){

                            mysql.getConnection(function(err, connection){
                                if(err){return reject(err)};

                                connection.query({
                                    sql: 'INSERT INTO tbl_survey_participants SET employee_number = ? , shift = ? , department = ?, date_time = ?',
                                    values: [participant_employee_number, user_details.shift, user_details.department, submit_date]
                                },  function(err, results){
                                    if(err){return reject(err)};
                                    resolve();
                                });

                                connection.release();
                            });

                        });
                    }

                    function insertCanteenSurvey(){
                        return new Promise(function(resolve, reject){
                            
                            mysql.getConnection(function(err, connection){
                                if(err){return reject(err)};

                                connection.query({
                                    sql: 'INSERT INTO tbl_canteen_survey SET css_q1 =?, css_q2 =?, css_q3 =?, css_q4 =?, css_q5 =?, css_q6 =?, css_q7 =?, css_q8 =?, css_q9 =?, css_q10 =?, css_q11 =?, css_q12 =?, css_q13 =?, css_q14 =?, css_q15 =?, css_qsub1 =?, css_qsub2 =?,css_qsub3 =?, employee_number = ?, shift =?, department =?, date_time =?',
                                    values: [
                                        form_details.css_q1,
                                        form_details.css_q2,
                                        form_details.css_q3,
                                        form_details.css_q4,
                                        form_details.css_q5,
                                        form_details.css_q6,
                                        form_details.css_q7,
                                        form_details.css_q8,
                                        form_details.css_q9,
                                        form_details.css_q10,
                                        form_details.css_q11,
                                        form_details.css_q12,
                                        form_details.css_q13,
                                        form_details.css_q14,
                                        form_details.css_q15,
                                        form_details.css_qsub1,
                                        form_details.css_qsub2,
                                        form_details.css_qsub3,
                                        user_details.employeeNumber,
                                        user_details.shift,
                                        user_details.department,
                                        submit_date
                                    ]
                                },  function(err, results){
                                    if(err){return reject(err)};

                                    //console.log(results);
                                    resolve();
                                });

                                connection.release();

                            });

                        });
                    }

                    function insertShuttleSurvey(){
                        return new Promise(function(resolve, reject){
                            
                            mysql.getConnection(function(err, connection){
                                if(err){return reject(err)};

                                connection.query({
                                    sql: 'INSERT INTO tbl_shuttle_survey SET shuttle_route = ?, shift =?, shuttle_bus_marshall = ?, sss_q1 = ?, sss_q2 = ?, sss_q3 = ?, sss_q4 = ?, sss_q5 = ?, sss_q6 = ?, sss_q7 = ?, sss_q8 = ?, sss_q9 = ?, sss_q10 = ?, sss_q11 = ?, sss_q12 = ?, sss_q13 = ?, sss_q14 = ?, sss_q15 = ?, sss_qsub1 =?, sss_qsub2 =?, sss_qsub3 =?, employee_number = ?, department =?, date_time =?',
                                    values: [
                                        form_details.shuttle_route,
                                        user_details.shift,
                                        form_details.shuttle_bus_marshall,
                                        form_details.sss_q1,
                                        form_details.sss_q2,
                                        form_details.sss_q3,
                                        form_details.sss_q4,
                                        form_details.sss_q5,
                                        form_details.sss_q6,
                                        form_details.sss_q7,
                                        form_details.sss_q8,
                                        form_details.sss_q9,
                                        form_details.sss_q10,
                                        form_details.sss_q11,
                                        form_details.sss_q12,
                                        form_details.sss_q13,
                                        form_details.sss_q14,
                                        form_details.sss_q15,
                                        form_details.sss_qsub1,
                                        form_details.sss_qsub2,
                                        form_details.sss_qsub3,
                                        user_details.employeeNumber,
                                        user_details.department,
                                        submit_date
                                    ]
                                },  function(err, results){
                                    if(err){return reject(err)};

                                    //console.log(results);
                                    resolve();
                                });

                                connection.release();

                            });

                        });
                    }

                    insertCanteenSurvey().then(function(){
                        return insertShuttleSurvey().then(function(){
                            return participantsList().then(function(){
                                
                                res.send({auth: 'Saved'});

                            },  function(err){
                                res.send({err: 'ERR' + err});
                            });
                        },  function(err){
                            res.send({err: 'ERR' + err});
                        });
                    },  function(err){
                        res.send({err: 'ERR' + err});
                    });

                }
            }
        });

    });

    app.get('/upload-employee-list', function(req, res){
        res.render('upload_headcount');
    });

    /** post admin to update employee list */
    app.post('/api/employeeList', function(req, res){

        let form = new formidable.IncomingForm();

        form.maxFileSize = 2 * 1024 * 1024;

        form.parse(req, function(err, fields, file){

            if(err){return {err: '<span class="fa fa-times" style="color: red;"></span> Invalid file. ' + err}};

            if(file){


                let excelFile = {
                    date_upload: new Date(),
                    path: file.upload_form.path,
                    name: file.upload_form.name,
                    type: file.upload_form.type,
                    date_modified: file.upload_form.lastModifiedDate
                }

                let workbook = XLSX.readFile(excelFile.path);

                let employeeList_worksheet = XLSX.utils.sheet_to_json(workbook.Sheets['employeelist'], {header: 'A'});
                let cleaned_employeeList = [];

                let upload_date = new Date();

                /** cleaning workbook employee list to array */
                for(let i=0; i<employeeList_worksheet.length;i++){

                    if(employeeList_worksheet[i].A){

                        cleaned_employeeList.push(
                            [
                                employeeList_worksheet[i].A,
                                employeeList_worksheet[i].B,
                                employeeList_worksheet[i].C,
                                employeeList_worksheet[i].D,
                                employeeList_worksheet[i].E,
                                employeeList_worksheet[i].F,
                                employeeList_worksheet[i].G,
                                upload_date
                            ]
                        );

                    }

                }


                /** for bulk inserts - dada */
                function insertEmployeeList(){
                    return new Promise(function(resolve, reject){

                            mysql.getConnection(function(err, connection){
                                if(err){return reject('Connection error @ insertEmployeeList ')};

                                connection.query({
                                    sql: 'INSERT INTO tbl_employee_hc (employee_number, lastname, firstname, middlename, department, supervisor, shift, upload_date) VALUES ?',
                                    values: [cleaned_employeeList]
                                },  function(err, results){
                                    if(err){ return reject(err) };

                                    resolve(results.insertID);
                                });

                                connection.release();


                            });

                    });
                }

                insertEmployeeList().then(function(){
                    
                    res.send({auth:'<span class="fa fa-check" style="color: green;"></span> Successfully uploaded'});
                },  function(err){

                    res.send({err: '<span class="fa fa-times" style="color: red;"></span> Invalid format ' + err});
                });


            } else {
                res.send({err: '<span class="fa fa-times" style="color: red;"></span> Invalid file. ' + err});
            }

        });

    });

}