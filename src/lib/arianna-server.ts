import { spawn } from 'child_process';
import path from 'path';

export class AriannaServer {
    private serverProcess: any;
    private readonly serverPath = "C:\\Users\\russe\\Downloads\\AriannaServer.0x20250130.A\\AriannaServer.exe";

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.serverProcess = spawn(this.serverPath, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    detached: false
                });

                this.serverProcess.stdout.on('data', (data: Buffer) => {
                    console.log('Arianna Server:', data.toString());
                });

                this.serverProcess.stderr.on('data', (data: Buffer) => {
                    console.error('Arianna Server Error:', data.toString());
                });

                // Wait for server to be ready
                setTimeout(resolve, 1000);

            } catch (error) {
                reject(error);
            }
        });
    }

    stop(): void {
        if (this.serverProcess) {
            this.serverProcess.kill();
        }
    }
}