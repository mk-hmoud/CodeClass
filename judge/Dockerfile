FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake ca-certificates nlohmann-json3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY . .

# Compile hiredis from source into the expected lib/include layout
RUN cd dependencies/hiredis && \
    mkdir -p build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release \
             -DBUILD_SHARED_LIBS=OFF \
             -DCMAKE_INSTALL_PREFIX=/build/dependencies/hiredis && \
    make -j"$(nproc)" && \
    make install

# Build the judge binary
RUN mkdir -p bin && \
    cmake -S . -B cmake-build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build cmake-build -j"$(nproc)"

# ---- runtime ----
FROM debian:bookworm-slim

# Install docker-cli so the judge can spawn sandbox containers via the host socket
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg lsb-release && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg \
         -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
         https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
         > /etc/apt/sources.list.d/docker.list && \
    apt-get update && apt-get install -y --no-install-recommends docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /build/bin/judge ./judge

CMD ["./judge"]
