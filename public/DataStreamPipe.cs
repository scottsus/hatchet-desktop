using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using System.IO.Pipes;
using System.Threading.Tasks;

namespace DataStreamer {
    internal class DataStreamerPipe {
        private static bool bStop = false;
        private static List<String> ListaMessaggi = new();
        private static List<string> ListaTracks = new List<string>();

        /* Read the data from the file and return the operator number.
         */
        private static int ReadData() {
            string file1 = "RawData_20240408_090001_000001_000001_001.decod.74h";
            //			string file1 = "C:\\Users\\fabri\\OneDrive - dune s.r.l\\Documenti\\AriannaMap Data\\AriannaLight\\RawData_20240408_090001_000001_000001_001.decod.74h";
            //			string file1 = "D:\\Users\\fabri\\OneDrive - dune s.r.l\\Documenti\\AriannaMap Data\\AriannaLight\\RawData_20240408_090001_000001_000001_001.decod.74h";

            if (File.Exists(file1)) {
                Console.WriteLine(file1);
            } else {
                file1 = "./" + Path.GetFileName(file1);
                if (File.Exists(file1)) {
                    Console.WriteLine(file1);
                } else {
                    Console.WriteLine("Error. File [" + file1 + "] doesn't exist");
                    bStop = true;
                    return -1;
                }
            }
            using (var sr = new StreamReader(file1)) {
                var table = sr.ReadToEnd();
                var data = table.Split('\n');
                ListaMessaggi = data.ToList().FindAll(p => p.Length > 0 && p[0] == '#');
            }
            int op = -1;

            //var first =ListaMessaggi.First(p => p.StartsWith("#"));
            var first = new string(ListaMessaggi.First(p => p.StartsWith("#")).Skip(1).Take(2).ToArray());
            if (first != null) {
                op = Convert.ToUInt16(first, 16);
            }
            return op;
        }

        /*  Init the operatorin the library.
         */        
        private static async Task InitOperatore(StreamWriter? writer, int op) {
            //Write command on te pipe
            await writer.WriteLineAsync("Init " + op);
        }

        /* Set parameters for the operator. You can update the parameters as you like.
         */
        private static async Task SetParameters(StreamWriter? writer,int op) {

            //SetParameters 1,2.5,-3.7, 0.034906585039886591,0.1,0,4, 41.87892716196967,12.508081927663124
            double X0 = 2.5;                        // X0 offset from the strarting point in meters
            double Y0 = -3.7;                       // Y0 offset from the strarting point in meters
            double Rot = 0.034906585039886591;      // Rotation compensation related to the North in radiants
            double W1 = 0.10;                       // "Correctional factor" corection
            double W2 = 0;                          // internal do not use. set 0
            int Sel = 4;                            // Algorithm selection. 4 is the standard
            double Lat = 41.87892716196967;         // Latitude of the starting point
            double Lon = 12.508081927663124;        // Longitude of the starting point

            // Set parametr string for operator op
            var message = "SetParameters " + op + "," + X0 + "," + Y0 + "," + Rot + "," + W1 + "," + W2 + "," + Sel + "," + Lat + "," + Lon + Environment.NewLine;

            //Write command on te pipe
            await writer.WriteLineAsync(message);
        }
        /* Start the communication with the server.
         */
        public static async Task StartAsync() {
            // Pipe A -> client scrive
            using NamedPipeClientStream pipeClientOut =
                new NamedPipeClientStream(".", "AriannaSrv.Pipe.In", PipeDirection.Out, PipeOptions.Asynchronous);

            // Pipe B -> client legge
            using NamedPipeClientStream pipeClientIn =
                new NamedPipeClientStream(".", "AriannaSrv.Pipe.Out", PipeDirection.In, PipeOptions.Asynchronous);

            Console.WriteLine("Client: pipes connection...");

            await pipeClientOut.ConnectAsync();
            await pipeClientIn.ConnectAsync();

            Console.WriteLine("Client: connected !");

            // Avviamo due Task distinti per lettura e scrittura

            // Scrittura su PipeA
            var writeTask = Task.Run(async () => {
                
                int op=ReadData();
                if (op < 0)
                    return;

                int i = 0;
                try {
                    using var writer = new StreamWriter(pipeClientOut, Encoding.UTF8) { AutoFlush = true };

                    await InitOperatore(writer, op);    // Init Library
                    await SetParameters(writer, op);    // Set Parameters
                                                        // Send All Messages
                    foreach (var msg in ListaMessaggi) {
                        string message = $"Messagge {i} from Client";
                        Console.WriteLine("Client send: " + message);
                        await writer.WriteLineAsync("Set " + msg.TrimEnd());

                        await Task.Delay(100); //standard delay should be 1000: 1 Msg @ 1 sec

                        i++;
                        if (i % 10 == 0) {
                            ListaTracks.Clear();
                            await writer.WriteLineAsync("Get " + op);       // Get full updated Track
                        } else {
                            //await writer.WriteLineAsync("Last  " + op);   // Update Last Position in the track
                        }
                    }
                    // Stop the communication
                    await writer.WriteLineAsync("Stop " + op);

                    // Save the track in a file
                    File.WriteAllLines("Track.txt", ListaTracks);

                } catch (IOException ex) {
                    Console.WriteLine("Errore writing: " + ex.Message);
                }
            });

            // Pipe In Reading. Replace the message with the updated track
            var readTask = Task.Run(async () => {
                try {
                    using var reader = new StreamReader(pipeClientIn, Encoding.UTF8);
                    while (true) {
                        string? messageFromServer = await reader.ReadLineAsync();
                        if (messageFromServer == null) {
                            // Fine stream
                            break;
                        }
                        if (messageFromServer.Length > 0) {
                            if (messageFromServer.StartsWith("Stop")) {
                                Console.WriteLine("End");
                                break;
                            } else { 
                                ListaTracks.Add(messageFromServer);
                            }
                        }
                        //Console.WriteLine("Client ha ricevuto: " + ListaTracks.Count);
                    }
                } catch (IOException ex) {
                    Console.WriteLine("Error reading: " + ex.Message);
                }
            });

            // wait for both tasks to complete
            await Task.WhenAll(writeTask, readTask);

            Console.WriteLine("Client: comunication ended. Press enter to finish.");
            Console.ReadLine();
        }
    }
}