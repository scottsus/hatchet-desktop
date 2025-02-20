import { Socket } from 'net';

export class PipeHandler {
    private isConnected: boolean = false;
    private trackData: string[] = [];
    private messageQueue: string[] = [];
    private reconnectAttempts: number = 0;
    private readonly MAX_RECONNECT_ATTEMPTS: number = 5;
    private inClient!: Socket;
    private outClient!: Socket;

    constructor() {
        this.setupPipes();
    }

    private setupPipes(): void {
        this.outClient = new Socket();
        this.inClient = new Socket();

        this.outClient.connect('\\\\.\\pipe\\AriannaSrv.Pipe.Out', () => {
            this.inClient.connect('\\\\.\\pipe\\AriannaSrv.Pipe.In', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.processMessageQueue();
            });
        });

        this.outClient.on('data', (data) => {
            this.trackData.push(data.toString());
        });

        this.outClient.on('close', () => {
            this.isConnected = false;
            this.reconnect();
        });

        this.inClient.on('error', (err) => {
            console.error('Input pipe error:', err);
            this.reconnect();
        });

        this.outClient.on('error', (err) => {
            console.error('Output pipe error:', err);
            this.reconnect();
        });
    }

    async sendCommand(command: string): Promise<string> {
        if (!this.isConnected) {
            this.messageQueue.push(command);
            return '';
        }

        return new Promise((resolve) => {
            const prevTrackLength = this.trackData.length;
            this.inClient.write(command + '\n');

            if (command.startsWith('Get')) {
                const checkResponse = () => {
                    if (this.trackData.length > prevTrackLength) {
                        resolve(this.trackData[this.trackData.length - 1]);
                    } else {
                        setTimeout(checkResponse, 100);
                    }
                };
                checkResponse();
            } else {
                resolve('');
            }
        });
    }

    private async reconnect(): Promise<void> {
        if (!this.isConnected && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            setTimeout(() => this.setupPipes(), 1000);
        }
    }

    private async processMessageQueue(): Promise<void> {
        while (this.messageQueue.length > 0) {
            const command = this.messageQueue.shift();
            if (command) {
                await this.sendCommand(command);
            }
        }
    }
}