# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy backend package files and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy the rest of the backend source code
COPY backend/ .

# Make port 5001 available to the world outside this container
EXPOSE 5001

# Run the app when the container launches
CMD ["npm", "start"]
