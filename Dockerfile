# Multi-stage build using UBI9 as builder base
FROM registry.access.redhat.com/ubi9/ubi:latest AS builder

# Install dependencies for Deno
RUN dnf update -y && \
    dnf install -y wget unzip ca-certificates && \
    dnf clean all

# Install Deno using wget instead of curl to avoid conflicts
ENV DENO_INSTALL=/deno
RUN wget -qO- https://deno.land/install.sh | sh
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Verify Deno installation
RUN deno --version

# Set working directory
WORKDIR /app

# Copy only necessary files for compilation
COPY src/ ./src/
COPY deno.json ./
COPY deno.lock ./

# Cache dependencies first
RUN deno cache src/server.ts

# Compile the application to a binary
RUN deno compile \
    --allow-net \
    --allow-read \
    --allow-env \
    --target x86_64-unknown-linux-gnu \
    --output white-rabbit \
    src/server.ts

# Verify the binary was created and is executable
RUN ls -la white-rabbit

# Final stage - minimal runtime image
FROM registry.access.redhat.com/ubi9/ubi-minimal:latest

# Install minimal runtime dependencies
RUN microdnf update -y && \
    microdnf clean all

# Create non-root user
RUN useradd -r -s /bin/false -d /app whiterabbit

# Set working directory
WORKDIR /app

# Copy the compiled binary from builder stage
COPY --from=builder /app/white-rabbit /app/white-rabbit

# Change ownership to non-root user
RUN chown whiterabbit:whiterabbit /app/white-rabbit && \
    chmod +x /app/white-rabbit

# Switch to non-root user
USER whiterabbit

# Set environment variables for server configuration
ENV WR_HOST=0.0.0.0
ENV WR_PORT=8000

# Expose port
EXPOSE 8000

# Health check (curl-minimal is available in ubi-minimal)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://0.0.0.0:8000/health || exit 1

# Start the emulator
CMD ["./white-rabbit"]
