FROM ubuntu:20.04

RUN apt update -y && \
    apt install -y g++ build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN make all

ENV LD_LIBRARY_PATH=/app/lib:$LD_LIBRARY_PATH

CMD ["./build/main"]
