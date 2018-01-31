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
  addDevice: addDevice,
  updateDevice: updateDevice,
  deleteDevice: deleteDevice,
  getDevice: getDevice
};


function addDevice(req, res) {
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
  var deviceobj = req.body;
  var isValid = true;
  console.log(deviceobj);
  if(deviceobj.constructor === Object && Object.keys(deviceobj).length === 0) {
    console.log("is valid = false0");
    SendInvalidInput(res, INVALID_INPUT);
  }
  else {
    if(!deviceobj.DeviceID)
    {
      console.log("is valid = false1");
       SendInvalidInput(res, INVALID_INPUT);
    }
    else {
      // check if asset exists

      IsDeviceExist(deviceobj.DeviceID, function(ret1){
          if (ret1) {
            console.log("isvalid=false2");
            SendInvalidInput(res,ALREADY_EXIST);
          }
          else {
            console.log("scan ok, no device found!");
            if (deviceobj.DeviceID && deviceobj.Type && deviceobj.AssetID) {
                 var assetModule = require('./asset.js');
                 assetModule.IsAssetExist(deviceobj.AssetID, function(fnret)
               {
                 if (fnret)
                 {
                   var params = {
                     TableName: tables.deviceConfig,
                     Item : deviceobj,
                     ConditionExpression : "attribute_not_exists(DeviceID)"
                   };
                   console.log(params)
                   docClient.put(params, function(err, data) {
                   if (err) {
                     var msg = "Error:" + JSON.stringify(err, null, 2);
                     console.error(msg);
                     SendInternalErr(res,msg);
                   }else{
                     SendSuccess(res);
                   }
                   });
                 }
                 else {
                   SendInvalidInput(res, NOT_EXIST);
                 }
               });
            }
            else {
              console.log("isvalid=false2");
              SendInvalidInput(res, INVALID_INPUT);
            }
          }
      });
    }
  }



  // this sends back a JSON response which is a single string

}

function updateDevice(req, res) {
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
  var deviceobj = req.body;
  var isValid = true;
  console.log(deviceobj);
  if(deviceobj.constructor === Object && Object.keys(deviceobj).length === 0) {
    SendInvalidInput(res, INVALID_INPUT);
  }
  else {
    if(!deviceobj.DeviceID)
    {
       SendInvalidInput(res, INVALID_INPUT);
    }
    else {
      // check if asset exists
      IsDeviceExist(deviceobj.DeviceID, function(ret1, data){
          if (ret1) {
            var updateItems = "set ";
            var expressvalues = {};

            var i = 0
            for (var key in deviceobj)
            {
              if (deviceobj.hasOwnProperty(key))
              {
                if (key != "DeviceID" && key != "Type")
                {
                  updateItems = updateItems + key.toString() + " = :v" + i.toString() + ",";
                  expressvalues[":v" + i.toString()] = deviceobj[key];
                  i++;
                }
              }
            }

            updateItems = updateItems.slice(0, -1);

            var updateParams = {
                  TableName : tables.deviceConfig,
                  Key : {
                    DeviceID : data.Items[0].DeviceID,
                    Type : data.Items[0].Type
                },
                UpdateExpression : updateItems,
                ExpressionAttributeValues : expressvalues
              };
            console.log(updateParams);
            docClient.update(updateParams, function (err, data) {
                 if (err) {
                     var msg = "Unable to update the settings table.( POST /settings) Error JSON:" +  JSON.stringify(err, null, 2);
                     console.error(msg);
                     var errmsg = {
                       message: msg
                     };
                     res.status(500).send(errmsg);
                 } else {
                   var msg = {
                     message: "Success"
                   };
                   console.log("asset updated!");
                   res.status(200).send(msg);
                 }
             });
          }
          else {
            console.log("isvalid=false2");
            SendInvalidInput(res,NOT_EXIST);
          }
      });
    }
  }



  // this sends back a JSON response which is a single string

}


function deleteDevice(req, res) {
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
  var deviceID = req.swagger.params.DeviceID.value;
  // check if asset exists
  IsDeviceExist(deviceID, function(ret1, data){
      if (ret1) {
        var deleteParams = {
              TableName : tables.deviceConfig,
              Key : {
                DeviceID : data.Items[0].DeviceID,
                Type : data.Items[0].Type
            }
          };
        console.log(deleteParams);
        docClient.delete(deleteParams, function (err, data) {
             if (err) {
                 var msg = "Unable to delete the settings table.( POST /settings) Error JSON:" +  JSON.stringify(err, null, 2);
                 console.error(msg);
                 var errmsg = {
                   message: msg
                 };
                 res.status(500).send(errmsg);
             } else {
               var msg = {
                 message: "Success"
               };
               console.log("deivce deleted!");
               res.status(200).send(msg);
             }
         });
      }
      else {
        console.log("isvalid=false2");
        SendInvalidInput(res,NOT_EXIST);
      }
  });



  // this sends back a JSON response which is a single string

}

function getDevice(req, res) {
  var assetID = req.swagger.params.AssetID.value;
  var Params = {
     TableName : shareUtil.tables.deviceConfig,
     FilterExpression : "AssetID = :v1",
     ExpressionAttributeValues : {':v1' : assetID.toString()}
  };
  console.log(Params);
  shareUtil.awsclient.scan(Params, onScan);
  function onScan(err, data) {
       if (err) {
           var msg = "Error:" + JSON.stringify(err, null, 2);
           shareUtil.SendInternalErr(res,msg);
       } else {
         if (data.Count == 0)
         {
           shareUtil.SendNotFound(res);
         }
         else {
           shareUtil.SendSuccessWithData(res, data);
         }

       }
   }
}

function IsDeviceExist(deviceID, callback) {

  var Params = {
     TableName : tables.deviceConfig,
     FilterExpression : "DeviceID = :v1",
     ExpressionAttributeValues : {':v1' : deviceID.toString()}
  };
  docClient.scan(Params, onScan);
  function onScan(err, data) {
       if (err) {
           var msg = "Error:" + JSON.stringify(err, null, 2);
           SendInternalErr(res,msg);
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

function SendInvalidInput(res, msg)
{
  var errmsg = {
    message: msg
  };
  console.log(errmsg);
  res.status(400).send(errmsg);
}
function SendSuccess(res, msg = SUCCESS_MSG)
{
  var errmsg = {
    message: msg
  };
  console.log(errmsg);
  res.status(200).send(errmsg);
}
function SendInternalErr(res, msg)
{
  var errmsg = {
    message: msg
  };
  console.log(errmsg);
  res.status(400).send(errmsg);
}
