# build step
ARG REGISTRY
ARG NODE_VERSION=26-alpine

FROM ${REGISTRY}node:${NODE_VERSION} AS build

WORKDIR /usr/src/build

COPY app/incidents .

RUN ["npm", "i"]
RUN ["npm", "run", "build"]

FROM sapse/html5-app-deployer:7.4.0 AS run
USER node
COPY --chown=node:node --from=build /usr/src/build/dist/*.zip resources/

CMD ["node", "node_modules/@sap/html5-app-deployer/index.js"]
