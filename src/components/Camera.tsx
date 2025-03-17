import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { RxCross2 } from "react-icons/rx";


const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelColor, setModelColor] = useState<tf.LayersModel | null>(null);
  const [modelGray, setModelGray] = useState<tf.LayersModel | null>(null);

  const [mayorIndice, setMayorIndice] = useState<number>(0)

  const [prediccionColor, setPrediccionColor] = useState<string>("")
  const [prediccionGray, setPrediccionGray] = useState<string>("")

  const [acercaDelModeloColor, setAcercaDelModeloColor] = useState(false)
  const [acercaDelModeloGray, setAcercaDelModeloGray] = useState(false)


  const clase= ["GATO", "PERRO"]

  // Load TensorFlow.js model
  useEffect(() => {
    const loadModelColor = async () => {
      try {
        const loadedModelColor = await tf.loadLayersModel('/model_color/model.json'); // Replace with your model URL
        const loadedModelGray = await tf.loadLayersModel('/model_gray/model.json'); // Replace with your model URL

        setModelColor(loadedModelColor);
        setModelGray(loadedModelGray);

      } catch (error) {
        console.error('Error loading the model:', error);
      }
    };

    loadModelColor();
  }, []);

  // Access the camera and run predictions
  useEffect(() => {
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            predict();
          };
        }
      } catch (error) {
        console.error('Error accessing the camera:', error);
      }
    };

    const predict = async () => {
      if (!modelColor || !modelGray || !videoRef.current) return;

      const video = videoRef.current;

      // Continuously run predictions
      const loop = async () => {
        // Capture a frame from the video
        const tensor = tf.browser.fromPixels(video);

        // Convert to grayscale
        const grayscaleTensor: any = tensor.mean(2); // Average across the RGB channels to get grayscale
        const grayscaleTensor3D = grayscaleTensor.expandDims(2); // Add a single channel dimension (100x100x1)

        // Resize to 100x100
        const resizedTensor = tf.image.resizeBilinear(tensor, [150, 150]);
        const resizedTensorGray = tf.image.resizeBilinear(grayscaleTensor3D as tf.Tensor3D, [100, 100])

        // Normalize pixel values to [0, 1] (if your model expects this)
        const normalizedTensor = resizedTensor.div(255);
        const normalizedTensorGray = resizedTensorGray.div(255)

        // Add batch dimension
        //tf.compat.v1.enable_eager_execution()
        var arr = normalizedTensor.expandDims(0)
        var arrGray = normalizedTensorGray.expandDims(0)


        // Run the model
        const preds: any = await modelColor.predict(arr);
        const predsGray: any = await modelGray.predict(arrGray)

        const predictionsArray = await preds.array(); // Convert tensor to array
        const predictionsGrayArray = await predsGray.array(); // Convert tensor to array




        // Convert logits to probabilities using softmax
        const probabilities = tf.softmax(preds);
        const probabilitiesArray = await probabilities.array();

        setMayorIndice(probabilitiesArray[0].indexOf(Math.max(...probabilitiesArray[0])))

        // Assuming the output is a 2D array (batch of predictions)
        const classProbabilities = predictionsArray[0]; // Get the first batch

        // Find the class with the highest probability
        var ind = classProbabilities.indexOf(Math.max(...classProbabilities))
        setMayorIndice(ind)
        setPrediccionColor(clase[ind])
        // console.log('Predicted class index:', predictedClassIndex);



        if (predictionsGrayArray[0] < 0.5) {
          setPrediccionGray(clase[0])
        } else {
          setPrediccionGray(clase[1])
        }



        // Clean up tensors to avoid memory leaks
        tf.dispose([
          tensor,
          grayscaleTensor,
          grayscaleTensor3D,
          resizedTensor,
          resizedTensorGray,
          normalizedTensor,
          normalizedTensorGray,
          arr,
          arrGray
        ]);

        // Request the next frame
        requestAnimationFrame(loop);
      };

      loop();
    };

    enableCamera();

    // Clean up
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [modelColor]);

  const switchCamera = async () => {
    try {
      // Get all available media devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
  
      if (videoDevices.length < 2) {
        console.warn('Only one camera found. Cannot switch.');
        return;
      }
  
      // Get the current device ID
      const currentStream = videoRef.current?.srcObject as MediaStream;
      const currentTrack = currentStream?.getVideoTracks()[0];
      const currentDeviceId = currentTrack?.getSettings().deviceId;
  
      // Find the next camera
      const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDeviceId = videoDevices[nextIndex].deviceId;
  
      // Stop the current stream
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
  
      // Start the new stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDeviceId } },
      });
  
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  };

  const capaStyle = {
    margin: "auto 5px 5px 8px",
    padding: "3px 8px 3px 8px",
    borderRadius: "5px",
    backgroundColor: "#495057"
  }

  return (
    <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    }}>

    { acercaDelModeloColor && (
        <>
          <div style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)", /* Semi-transparent black background */
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: "999" /* Ensure it's on top of other elements */
          }} onClick={() => setAcercaDelModeloColor(!acercaDelModeloColor)}>
          </div>

          <div style={{
            margin: "0px auto 0px auto",
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            top: "400px",
            left: "50%",
            width: "95%",
            height: "800px",
            transform: "translate(-50%, -50%)",
            zIndex: "1000"
          }}>
            

            <div style={{
              backgroundColor: "#343A40",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              maxWidth: "400px",
              width: "100%",
              height: "100%",
              margin: "0px auto 0px auto"
            }}>
              <div style={{
                display: "flex",
                flexDirection: "row"
              }}>
                <div style={{
                  fontWeight: "bold",
                  fontSize: "20px",
                  marginBottom: "5px",
                }}>
                  Acerca del Modelo a Color
                </div>
                <div style={{
                  width: "50%",
                  display: "flex",
                  flexDirection: "column"
                }}>
                  <div style={{
                    backgroundColor: "#484A62",
                    borderRadius: "50%",
                    width: "25px",
                    height: "25px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    margin: "auto 0px auto auto",
                  }} onClick={() => setAcercaDelModeloColor(!acercaDelModeloColor)}>
                      <RxCross2 />
                  </div>
                </div>
              </div>
              
              <div>
                <div style={{
                  marginTop: "10px",
                  marginBottom: "10px"
                }}>
                  Se utilizó una red neuronal convolucional con las siguientes capas:
                </div>
                <div style={capaStyle}>0.- Capa de Input - [1, 150, 150, 3]</div>
                <div style={capaStyle}>1.- Capa Convolucional - 32 filtros (3 x 3)</div>
                <div style={capaStyle}>2.- Capa de Max Pooling - (2 x 2)</div>
                <div style={capaStyle}>3.- Capa Convolucional - 64 filtros (3 x 3)</div>
                <div style={capaStyle}>4.- Capa de Max Pooling - (2 x 2)</div>
                <div style={capaStyle}>5.- Capa Convolucional - 128 filtros (3 x 3)</div>
                <div style={capaStyle}>6.- Capa de Max Pooling - (2 x 2)</div>
                <div style={capaStyle}>7.- Capa Convolucional - 128 filtros (3 x 3)</div>
                <div style={capaStyle}>8.- Capa de Max Pooling - (2 x 2)</div>
                <div style={capaStyle}>9.- Capa de Droput - Removiendo 50% de informacion</div>
                <div style={capaStyle}>10.- Capa de Aplanado</div>

                <div style={capaStyle}>11.- Capa Densa - 512 neuronas, activación "relu"</div>
                <div style={capaStyle}>12.- Capa Densa (Final) - 2 neuronas</div>

                <div style={{
                  marginTop: "15px",
                  marginBottom: "10px"
                }}>
                  El resultado se procesa como softmax en el código de Javascript en el Frontend.
                </div>
              </div>
            </div>
          </div>
        </>
        )}


        { acercaDelModeloGray && (
        <>
          <div style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)", /* Semi-transparent black background */
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: "999" /* Ensure it's on top of other elements */
          }} onClick={() => setAcercaDelModeloGray(!acercaDelModeloGray)}>
          </div>

          <div style={{
            margin: "0px auto 0px auto",
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            top: "400px",
            left: "50%",
            width: "95%",
            height: "800px",
            transform: "translate(-50%, -50%)",
            zIndex: "1000"
          }}>
            

            <div style={{
              backgroundColor: "#343A40",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              maxWidth: "400px",
              width: "100%",
              height: "100%",
              margin: "0px auto 0px auto"
            }}>
              <div style={{
                display: "flex",
                flexDirection: "row"
              }}>
                <div style={{
                  fontWeight: "bold",
                  fontSize: "20px",
                  marginBottom: "5px",
                }}>
                  Acerca del Modelo en Grises
                </div>
                <div style={{
                  width: "50%",
                  display: "flex",
                  flexDirection: "column"
                }}>
                  <div style={{
                    backgroundColor: "#484A62",
                    borderRadius: "50%",
                    width: "25px",
                    height: "25px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    margin: "auto 0px auto auto",
                  }} onClick={() => setAcercaDelModeloGray(!acercaDelModeloGray)}>
                      <RxCross2 />
                  </div>
                </div>
              </div>
              
              <div>
                <div style={{
                  marginTop: "10px",
                  marginBottom: "10px"
                }}>
                  Se utilizó una red neuronal convolucional con las siguientes capas:
                </div>
                <div style={capaStyle}>0.- Capa de Input - [1, 100, 100, 1]</div>
                <div style={capaStyle}>1.- Capa Convolucional - 32 filtros (3 x 3)</div>
                <div style={capaStyle}>2.- Capa de Max Pooling - (2 x 2)</div>
                <div style={capaStyle}>3.- Capa Convolucional - 64 filtros (3 x 3)</div>
                <div style={capaStyle}>4.- Capa de Max Pooling - (2 x 2)</div>
                <div style={capaStyle}>5.- Capa Convolucional - 128 filtros (3 x 3)</div>
                <div style={capaStyle}>6.- Capa de Max Pooling - (2 x 2)</div>
                <div style={capaStyle}>7.- Capa de Aplanado</div>
                <div style={capaStyle}>8.- Capa Densa - 100 neuronas, activación "relu"</div>
                <div style={capaStyle}>9.- Capa Densa (Final) - 1 neurona, activacion Sigmoide</div>
                <div style={{
                  marginTop: "15px",
                  marginBottom: "10px"
                }}>
                  El resultado se redondea en el código de Javascript en el Frontend.
                </div>
              </div>
            </div>
          </div>
        </>
        )}

        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "7px"
        }}>
            <div style={{
                fontWeight: "bold",
                fontSize: "20px",
                marginTop: "15px"
            }}>PREDICCIÓN DE GATO O PERRO</div>
            <div style={{
                fontWeight: "bold",
                fontSize:"15px"
            }}>Manuel Cota</div>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "row",
          margin: "auto",
          width: "350px",
          marginBottom: "10px"
        }}>
          <button style={{
            marginRight: "10px"
          }} className="button" onClick={() => setAcercaDelModeloColor(!acercaDelModeloColor)} >Acerca del Modelo a Color</button>
          <button className="button" onClick={() => setAcercaDelModeloGray(!acercaDelModeloGray)} >Acerca del Modelo en Grises</button>
        </div>

        <div style={{
          display: "flex",
          width: "320px",
          marginBottom: "10px"
        }}>
          Apunta a algo con la cámara para clasificarlo como perro o gato:
        </div>

      <video style={{
        borderRadius: "10px",
        border: "3px solid white",
        width: "320px",
        maxHeight: "300px",
        marginBottom: "10px",
        backgroundColor: "#0E0E19"
        }} ref={videoRef} autoPlay playsInline muted />

      <button style={{
        width: "150px",
        margin: "auto auto 10px auto"
      }} className="buttonCamera" onClick={switchCamera}>Cambiar Cámara</button>

      <div style={{
        display: "flex",
        width: "350px"
      }}>
        
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          margin: "auto",
          width: "160px"
        }}>
          <h3>Predicción a Color:</h3>
          <pre style={{
            fontSize: "40px"
          }}>{prediccionColor}</pre>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          margin: "auto",
          width: "160px"
        }}>
          <h3>Predicción en Grises:</h3>
          <pre style={{
            fontSize: "40px"
          }}>{prediccionGray}</pre>
        </div>

      </div>

    </div>
  );
};

export default Camera;