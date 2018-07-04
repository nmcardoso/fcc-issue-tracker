/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;

const CONN_STR = process.env.DB; //MongoClient.connect(CONN_STR, function(err, db) {});

module.exports = function (app) {
  
  function convertToBoolean(obj) {
    if (obj.open) obj.open = obj.open == 'true' ? true : false;
  }
  
  function removeEmptyFields(obj) {
    let newObj = {};
    
    for (let k of Object.keys(obj))
      if (obj[k] != '') newObj[k] = obj[k];
    
    return newObj;
  }

  app.route('/api/issues/:project')
  
    .get(function (req, res){
      var project = req.params.project;
      
      MongoClient.connect(CONN_STR, (err, db) => {
        if (err) return console.log(err);
        
        const query = Object.assign({}, req.query);
        convertToBoolean(query);
        console.log(query);
        
        db.collection(project).find(query).toArray((err, docs) => {
          if (err) return console.log(err);
          
          res.json(docs);
          db.close();
        });
      });
    })
    
    .post(function (req, res){
      var project = req.params.project;
    
      if (!req.body.issue_title || !req.body.issue_text || !req.body.created_by
         || (req.body.issue_title && req.body.issue_title == '')
         || (req.body.issue_text && req.body.issue_text == '')
         || (req.body.created_by && req.body.created_by == ''))
        return res.status(200)
                  .type('text')
                  .send('Required fields not found');
      
      MongoClient.connect(CONN_STR, (err, db) => {
        if (err) return console.log(err);
        
        console.log('db conn opened');
        
        const now = new Date();
        const issue = Object.assign({}, req.body);
        issue.open = true;
        issue._id = new ObjectId();
        issue.updated_on = now;
        issue.created_on = now;

        db.collection(project).insertOne(issue, (err, result) => {
          if (err) return console.log(err);
          
          if (result.insertedCount === 1) {
            res.json(result.ops[0]);
          } else {
            console.log('insert error');
          }
          
          db.close();
          console.log('db conn closed');
        });
      });
    })
    
    .put(function (req, res){
      var project = req.params.project;
    
      const updateFields = removeEmptyFields(Object.assign({}, req.body));
    
      if (Object.keys(updateFields).length < 1) {
        res.status(200)
           .type('text')
           .send('no updated field sent');
        return;
      }
    
      MongoClient.connect(CONN_STR, (err, db) => {
        if (err) return console.log(err);
        
        delete updateFields._id;
        updateFields.updated_on = new Date();
        convertToBoolean(updateFields);
        
        const updateOp = {$set: updateFields};
        
        db.collection(project).findOneAndUpdate(
          {_id: ObjectId(req.body._id)},
          updateOp,
          null,
          (error, result) => {
            if (err) throw err;
            
            let response;
            
            if (result.value) response = 'successfully updated';
            else response = 'could not update ' + req.body._id;
            
            res.status(200)
               .type('text')
               .send(response);
            
            db.close();
          }
        );
      });
    })
    
    .delete(function (req, res){
      var project = req.params.project;
    
      if (!req.body._id || req.body.id == '') {
        res.status(200)
           .type('text')
           .send('_id error');
        return;
      }
    
      let idObj;
    
      try {
        idObj = ObjectId(req.body._id);
      } catch (e) {
        res.status(200)
           .type('text')
           .send('could not delete ' + req.body._id);
        return console.log(e);
      }
      
      MongoClient.connect(CONN_STR, (err, db) => {
        if (err) throw err;
        
        db.collection(project).findOneAndDelete(
          {_id: idObj},
          (err, r) => {
            if (err) throw err;
            
            let resp;
            
            if (r.value) resp = 'deleted ' + req.body._id;
            else resp = 'could not delete ' + req.body._id;
            
            res.status(200)
               .type('text')
               .send(resp);
            
            db.close();
          }
        );
      });
    });
};
