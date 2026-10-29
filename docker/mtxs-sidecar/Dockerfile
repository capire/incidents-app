# build step
ARG REGISTRY
ARG NODE_VERSION=26-alpine

FROM ${REGISTRY}node:${NODE_VERSION} AS build

WORKDIR /usr/src/build
COPY package*.json ./

RUN ["npm", "i"]

COPY /app ./app
COPY /srv ./srv
COPY /db ./db
COPY /mtx ./mtx

RUN ["npx", "cds", "build", "--for", "mtx-sidecar", "--production"]

WORKDIR /usr/src/build/gen/mtx/sidecar
RUN ["npm", "i", "--production"]

# runtime step
FROM ${REGISTRY}node:${NODE_VERSION} AS run

USER node
WORKDIR /usr/src/srv

# copy tsc compiled result from build step
COPY --chown=node:node --from=build /usr/src/build/gen/mtx/sidecar .

ENV NODE_ENV=production
