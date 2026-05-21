---
title: "Docker"
date: 2020-04-21T21:56:27+01:00
toc: true
tags: [docker]
autoCollapseToc: false
---

# Table of Contents
- [Commands](#commands)
    + [Start a shell prompt](#start-a-shell-prompt)
    + [Breakdown of docker image](#breakdown-of-docker-image)
    + [Execute Python commands in container](#execute-python-commands-in-container)
- [Docker Images](#docker-images)
    + [python3, java8 and Haskell](#python3--java8-and-haskell)

# Commands

### Start a shell prompt
To start a shell script inside a running container

`docker exec -it <container_name> bash`

To start a shell script inside an image

`docker run -it --entrypoint /bin/bash <image>`

### Breakdown of docker image
Will show a breakdown of layers of docker image

`docker image history <image_name>`

### Execute Python commands in container
`docker exec <container_name> python <script_name> <arg1> <arg2> ..`


# Docker Images

### python3, java8 and Haskell

```
FROM ubuntu:latest
 
# Update the respository source list
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y  software-properties-common && \
    apt-add-repository -y "ppa:hvr/ghc" &&\
    apt-get update

#Install Python
RUN apt-get update && apt-get install -y python3.6\
    python3-pip openjdk-8-jdk

#Install GHC and Cabal(Haskell bases)
RUN apt-get -yq update && apt-get -yq --no-install-suggests --no-install-recommends install \
    cabal-install-2.0 \
    cabal-install-head \
    ghc-8.2.2 \
    alex-3.1.7 \
    happy-1.19.5 \
  && rm -rf /var/lib/apt/lists/*

#Add these to our bin
ENV PATH=$HOME/.local/bin:/opt/ghc/8.2.2/bin:/opt/cabal/2.0/bin:/opt/happy/1.19.5/bin:/opt/alex/3.1.7/bin:$PATH

#Install Haskell libraries
RUN cabal update
RUN cabal install csv
RUN cabal install parsec
RUN cabal install text


# create and make our working directory
WORKDIR /app

#Copy current directory to the domino directory we made
COPY . /app

#Install Python Packages from requirements txt
RUN pip3 install -r requirements.txt


```