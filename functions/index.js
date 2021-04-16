
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//


exports.sendMessageToDriverOnNewOrder = functions.firestore.document('/Ordenes/{Ordenesid}')
    .onCreate(async (snap, context) => {
      const data = snap.data();

      const driverId= data.driver.id;
     
      functions.logger.log('el id del driver es', driverId);

      // Get the list of device notification tokens.
      const getDriverTokensref = admin.firestore()
          .doc(`/Conductores/${driverId}`)

      // Get the follower profile.
     // const getFollowerProfilePromise = admin.auth().getUser(context.auth.uid);

      // The snapshot to the user's tokens.
      let tokensSnapshot;

      // The array containing all the user's tokens.
      let tokens;

      //tipo de orden
      let tipoOrdenMessage;
      let linkImagen;

      switch (data.tipo) {
          case 'Envio':
            tipoOrdenMessage='un envio';
            linkImagen='https://firebasestorage.googleapis.com/v0/b/delivery-app-63126.appspot.com/o/iconoEnvio.png?alt=media&token=367669a6-07d9-41ac-b5f8-91721114c0f5';
              break;
          case 'Compra':
            tipoOrdenMessage='una compra';
            linkImagen='https://firebasestorage.googleapis.com/v0/b/delivery-app-63126.appspot.com/o/iconoCompras.png?alt=media&token=c3bc277f-38f5-4d9a-b1d3-46f026a441d1'
              break;
      
          default:
            tipoOrdenMessage='un taxi';
            linkImagen="https://firebasestorage.googleapis.com/v0/b/delivery-app-63126.appspot.com/o/iconoTaxi.png?alt=media&token=89295103-7863-4b8e-a2e3-721fc4564d42";

            

              break;
      }

      const results = await Promise.all([getDriverTokensref.get()]);
      tokensSnapshot = results[0];
      let t= tokensSnapshot.data().fcmTokens;
  
      

      // Check if there are any device tokens.
      if (t.length==null) {
        return functions.logger.log(
          'no hay tokens para enviar.'
        );
      }
      functions.logger.log(
        'hay',
        t.length,
        'tokens para enviar notificaciones'
      );
      //functions.logger.log('Fetched follower profile', follower);
      
      // Notification details.
      const payload = {
        notification: {
          title: 'Tienes una nueva orden!',
          body: `${data.usuario.nombre} ha solicitado ${tipoOrdenMessage} revisa las solicitudes en la app`,
          icon: linkImagen
          
        }
      };

      // Listing all tokens as an array.
      tokens = t;//Object.keys(tokensSnapshot.data().fcmTokens);
      // Send notifications to all tokens.
      const response = await admin.messaging().sendToDevice(tokens, payload);
      // For each message check if there was an error.
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          functions.logger.error(
            'Failure sending notification to',
            tokens[index],
            error
          );
          // Cleanup the tokens who are not registered anymore.
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
                

            tokensToRemove.push(getDriverTokensref.update({
                fcmTokens:admin.firestore.FieldValue.arrayRemove(tokens[index])
            }));
          //  tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
          }
        }
      });
      functions.logger.log(` tokens eliminados ${tokensToRemove} `)
      return Promise.all(tokensToRemove);
    });


exports.sendNotificationOnUpdateOrder= functions.firestore.document('/Ordenes/{Ordenesid}')
    .onUpdate(async(change,context)=>{

      const newValue = change.after.data();
      const previousValue = change.before.data();


      // ...or the previous value before this update
      

      const getuidEditor= newValue.lastUserOnEdit;

      let message;
      let linkImagen;
      let tokens;
      let path;

      switch (newValue.tipo) {
        case 'Envio':
          tipoOrdenMessage='un envio';
          linkImagen='https://firebasestorage.googleapis.com/v0/b/delivery-app-63126.appspot.com/o/iconoEnvio.png?alt=media&token=367669a6-07d9-41ac-b5f8-91721114c0f5';
            break;
        case 'Compra':
          tipoOrdenMessage='una compra';
          linkImagen='https://firebasestorage.googleapis.com/v0/b/delivery-app-63126.appspot.com/o/iconoCompras.png?alt=media&token=c3bc277f-38f5-4d9a-b1d3-46f026a441d1'
            break;
    
        default:
          tipoOrdenMessage='un taxi';
          linkImagen="https://firebasestorage.googleapis.com/v0/b/delivery-app-63126.appspot.com/o/iconoTaxi.png?alt=media&token=89295103-7863-4b8e-a2e3-721fc4564d42";

          

            break;
    }

      if (getuidEditor==newValue.usuario.id) {

        if (previousValue.estado=="Solicitada") {
          message={
            notification: {
              title: 'Se ha cancelado la orden!',
              body: `${newValue.usuario.nombre} ha cancelado su orden como aun era una solicitud no has obtenido ganancias`,
              icon: linkImagen
              
            }
          };;
  
          path= admin.firestore()
          .doc(`/Conductores/${newValue.driver.id}`);
          const results = await Promise.all([path.get()]);
          tokens= results[0].data().fcmTokens;
          
        } else {
          message={
            notification: {
              title: 'Se ha cancelado la orden!',
              body: `${newValue.usuario.nombre} ha cancelado su orden como ya habias aceptado esta orden, se ha asignado la mitad del monto total para ti`,
              icon: linkImagen
              
            }
          };;
  
          path= admin.firestore()
          .doc(`/Conductores/${newValue.driver.id}`);
          const results = await Promise.all([path.get()]);
          tokens= results[0].data().fcmTokens;
          
        }
        



        
      } else {

        if (newValue.estado=="Rechazada") {
          message={
            notification: {
              title: 'Se ha rechazado la orden!',
              body: `${newValue.driver.nombre} ha rechazado tu orden revisa tu historial `,
              icon: linkImagen
              
            }
          };;
  
          path= admin.firestore()
          .doc(`/usuarios/${newValue.usuario.id}`);
          const results = await Promise.all([path.get()]);
          tokens= results[0].data().fcmTokens;
          
        } else {
          message={
            notification: {
              title: 'Se ha aceptado la orden!',
              body: `${newValue.driver.nombre} ha aceptado tu orden revisa tu historial `,
              icon: linkImagen
              
            }
          };;
  
          path= admin.firestore()
          .doc(`/usuarios/${newValue.usuario.id}`);
          const results = await Promise.all([path.get()]);
          tokens= results[0].data().fcmTokens;
          
        }
        
      }


      const response = await admin.messaging().sendToDevice(token, message);
      // For each message check if there was an error.
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          functions.logger.error(
            'Failure sending notification to',
            tokens[index],
            error
          );
          // Cleanup the tokens who are not registered anymore.
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
                

            tokensToRemove.push(path.update({
                fcmTokens:admin.firestore.FieldValue.arrayRemove(tokens[index])
            }));
       
          }
        }
      });
      functions.logger.log(` tokens eliminados ${tokensToRemove} `)
      return Promise.all(tokensToRemove);

    });

exports.sendLandNotification= functions.https.onCall(async(data, context) => {
  var id=data.idCliente;
  var DriverName= data.driverName;
  var tipo= data.tipo;
  let message;
  

  functions.logger.log(
    'el id del cliente es',
    id,
    'tokens para enviar notificaciones'
  );

  switch (tipo) {
    case 'Envio':
      message={
        notification: {
          title: 'Tu envio ha llegado ',
          body: `${DriverName} ha llegado a la direccion recibelo`,
            
        }
      };
      
      break;
    case 'Compra':
      message={
        notification: {
          title: 'Tu compra ha llegado ',
          body: `${DriverName} ha llegado a la direccion recibelo`,
            
        }
      };
      
      break;
    case 'Taxi':
      message={
        notification: {
          title: 'Tu taxi ha llegado ',
          body: `${DriverName} ha llegado a la direccion recibelo`,
            
        }
      };
      
      break;
  
    default:
      break;
  }

   
 
  
  let path=admin.firestore()
  .doc(`/usuarios/${id}`);
  const results = await Promise.all([path.get()]);;
  let  token= results[0].data().fcmTokens;

  const response = await admin.messaging().sendToDevice(token, message);
  // For each message check if there was an error.
  const tokensToRemove = [];
  response.results.forEach((result, index) => {
    const error = result.error;
    if (error) {
      functions.logger.error(
        'Failure sending notification to',
        token[index],
        error
      );
      // Cleanup the tokens who are not registered anymore.
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
            

        tokensToRemove.push(path.update({
            fcmTokens:admin.firestore.FieldValue.arrayRemove(token[index])
        }));
   
      }
    }
  });
  functions.logger.log(` tokens eliminados ${tokensToRemove} `)
  return Promise.all(tokensToRemove).then(()=>{
    return {"status":'ok'}

  }).catch((error)=>{
    throw new functions.https.HttpsError('unknown',error.message,error);;
  });
 });