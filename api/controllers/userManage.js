
var shareUtil = require('./shareUtil.js');
/*
 Once you 'require' a module you can reference the things that it exports.  These are defined in module.exports.

 For a controller in a127 (which this is) you should export the functions referenced in your Swagger document by name.

 Either:
  - The HTTP Verb of the corresponding operation (get, put, post, delete, etc)
  - Or the operationId associated with the operation in your Swagger document

  In the starter/skeleton project the 'get' operation on the '/hello' path has an operationId named 'hello'.  Here,
  we specify that in the exports of this module that 'hello' maps to the function named 'hello'
 */
module.exports = {
  createUser: createUser,
  updateUser: updateUser,
  authenticate: authenticate,
  getSettings: getSettings,
  updateSettings: updateSettings,
  logIn: logIn
};

function createUser(req, res) {
  var userobj = req.body;
  console.log(userobj);
  if(userobj.constructor === Object && Object.keys(userobj).length === 0) {
    console.log("is valid = false0");
    shareUtil.SendInvalidInput(res, shareUtil.constants.INVALID_INPUT);
  }
  else {
    if(!userobj.EmailAddress && !userobj.Password)
    {
      console.log("is valid = false1");
       shareUtil.SendInvalidInput(res, shareUtil.constants.INVALID_INPUT);
    }
    else {

      IsEmailExist(userobj.EmailAddress, function(ret1,data){
        if (ret1) { // exists
            console.log("exists");
            shareUtil.SendInvalidInput(res, 'User already exists');
        }
        else {
          // auto generate user id
          var epochtime = Math.floor((new Date).getTime()/1000);
          var uuidv1 = require('uuid/v1');
          var crypto = require('crypto');
          userobj['UserID'] = uuidv1();
          userobj['Created'] = epochtime;
          userobj['HashExpire'] = epochtime + 3600 * 1; // expire in one hour
          userobj['Hash'] = crypto.randomBytes(20).toString('hex');
          userobj['ApiKey'] = crypto.randomBytes(16).toString('hex');
          userobj['Active'] = 0;
          var params = {
            TableName: shareUtil.tables.users,
            Item : userobj,
            ConditionExpression : "attribute_not_exists(UserID)"
          };
          console.log(params)
          shareUtil.awsclient.put(params, function(err, data) {
          if (err) {
            var msg = "Error:" + JSON.stringify(err, null, 2);
            console.error(msg);
            shareUtil.SendInternalErr(res,msg);
          }else{
            console.log(userobj);
            shareUtil.SendSuccessWithData(res, userobj);
          }
          });
        }

      });
    }
  }


  // this sends back a JSON response which is a single string
}


function updateUser(req, res) {
  var userobj = req.body;
  console.log(userobj);
  if(userobj.constructor === Object && Object.keys(userobj).length === 0) {
    console.log("is valid = false0");
    shareUtil.SendInvalidInput(res, shareUtil.constants.INVALID_INPUT);
  }
  else {
    if(!userobj.EmailAddress)
    {
      console.log("is valid = false1");
       shareUtil.SendInvalidInput(res, shareUtil.constants.INVALID_INPUT);
    }
    else {

      IsEmailExist(userobj.EmailAddress, function(ret1,data){
        if (ret1) { // exists
          var updateItems = "set ";
          var expressvalues = {};

          var i = 0
          for (var key in userobj)
          {
            if (userobj.hasOwnProperty(key))
            {
              if (key != "EmailAddress")
              {
                updateItems = updateItems + key.toString() + " = :v" + i.toString() + ",";
                expressvalues[":v" + i.toString()] = userobj[key];
                i++;
              }
            }
          }

          updateItems = updateItems.slice(0, -1);

          var updateParams = {
                TableName : shareUtil.tables.users,
                Key : {
                  UserID : data.Items[0].UserID,
              },
              UpdateExpression : updateItems,
              ExpressionAttributeValues : expressvalues
            };
          console.log(updateParams);
          shareUtil.awsclient.update(updateParams, function (err, data) {
               if (err) {
                   var msg = "Error:" +  JSON.stringify(err, null, 2);
                   console.error(msg);
                   var errmsg = {
                     message: msg
                   };
                   res.status(500).send(errmsg);
               } else {
                 var msg = {
                   message: "Success"
                 };
                 console.log("user updated!");
                 res.status(200).send(msg);
               }
           });
        }
        else {
          console.log("exists");
          shareUtil.SendInvalidInput(res, 'User Not exists');
        }

      });
    }
  }


  // this sends back a JSON response which is a single string
}


function getSettings(req, res) {
  var userid = req.swagger.params.userID.value;

  if (typeof userid == "undefined")
  {
    shareUtil.SendInvalidInput(res, shareUtil.constants.INVALID_INPUT);
  }
  else {

        var params = {
          TableName: shareUtil.tables.users,
          KeyConditionExpression : "UserID = :v1",
          ExpressionAttributeValues : {':v1' : userid.toString()}
        };
        console.log(params)
        shareUtil.awsclient.query(params, function(err, data) {
        if (err) {
          var msg = "Error:" + JSON.stringify(err, null, 2);
          console.error(msg);
          shareUtil.SendInternalErr(res,msg);
        }else{
          console.log(data);
          if (data.Count == 1) {
            if (typeof data.Items[0].Settings.ParameterList == "undefined")
            {
              var msg = "Error: Cannot find data"
              shareUtil.SendInvalidInput(res,shareUtil.constants.NOT_EXIST);
            }
            else {
              shareUtil.SendSuccessWithData(res, data.Items[0].Settings.ParameterList);
            }

          }
          else {
              var msg = "Error: Cannot find data"
             shareUtil.SendInvalidInput(res,shareUtil.constants.NOT_EXIST);
          }

        }
      });
  }

  // this sends back a JSON response which is a single string
}

function updateSettings(req, res) {
  var settingobj = req.body;
  console.log(settingobj);
  if(settingobj.constructor === Object && Object.keys(settingobj).length === 0) {
    console.log("is valid = false0");
    shareUtil.SendInvalidInput(res, shareUtil.constants.INVALID_INPUT);
  }
  else {

    var updateItems = "set ";
    var expressvalues = {};

    var i = 0
    for (var key in settingobj.parameters)
    {
      if (settingobj.parameters.hasOwnProperty(key))
      {
        if (key != "DeviceID" && key != "Type")
        {
          updateItems = updateItems + "Settings.ParameterList." + key.toString() + " = :v" + i.toString() + ",";
          expressvalues[":v" + i.toString()] = settingobj.parameters[key];
          i++;
        }
      }
    }

    updateItems = updateItems.slice(0, -1);

    var updateParams = {
          TableName : shareUtil.tables.users,
          Key : {
            UserID : settingobj.UserID,
        },
        UpdateExpression : updateItems,
        ExpressionAttributeValues : expressvalues
      };
    console.log(updateParams);
    shareUtil.awsclient.update(updateParams, function (err, data) {
         if (err) {
             var msg = "Error:" +  JSON.stringify(err, null, 2);
             console.error(msg);
             var errmsg = {
               message: msg
             };
             res.status(500).send(errmsg);
         } else {
           var msg = {
             message: "Success"
           };
           console.log("user setting updated!");
           res.status(200).send(msg);
         }
     });
  }
}


function authenticate(apikey, callback) {
  var Params = {
   TableName : shareUtil.tables.users,
   FilterExpression : "ApiKey = :v1",
   ExpressionAttributeValues : {':v1' : apikey.toString()}
};
  shareUtil.awsclient.scan(Params, onScan);
  function onScan(err, data) {
     if (err) {
         var err_msg = "Error:" + JSON.stringify(err, null, 2);
         var msg = {
           message: err_msg
         }
         callback(false, msg);
     } else {
       if (data.Count == 0)
       {
         callback(false, data);
       }
       else {
         callback(true, data);
       }

     }
  }
}

function logIn(req, res){
  var userobj = req.body;
  console.log(userobj);
  if(userobj.constructor === Object && Object.keys(userobj).length === 0) {
    console.log("is valid = false0");
    shareUtil.SendInvalidInput(res, shareUtil.constants.INVALID_INPUT);
  }
  else {
    if(!userobj.EmailAddress && !userobj.Password)
    {
      console.log("is valid = false1");
       shareUtil.SendInvalidInput(res, shareUtil.constants.INVALID_INPUT);
    }
    else {

      IsEmailExist(userobj.EmailAddress, function(ret1,data){
        if (ret1) { // exists
          // check password
          if (data.Items[0].Password == userobj.Password)
          {
             if (data.Items[0].Active == 0)
             {
               shareUtil.SendInvalidInput(res, 'log in failed, user not active');
             }
             else {
                shareUtil.SendSuccessWithData(res, data.Items[0]);
             }

          }
          else {
            shareUtil.SendInvalidInput(res, 'log in failed, wrong password');
          }
        }
        else {
          shareUtil.SendInvalidInput(res, 'log in failed');
        }

      });
    }
  }


  // this sends back a JSON response which is a single string
}


function IsEmailExist(email, callback){
  var Params = {
   TableName : shareUtil.tables.users,
   FilterExpression : "EmailAddress = :v1",
   ExpressionAttributeValues : {':v1' : email.toString()}
};
  shareUtil.awsclient.scan(Params, onScan);
  function onScan(err, data) {
     if (err) {
         var msg = "Error:" + JSON.stringify(err, null, 2);
         shareUtil.SendInternalErr(res,msg);
     } else {
       if (data.Count == 0)
       {
         callback(false, data);
       }
       else {
         callback(true, data);
       }

     }
  }
}