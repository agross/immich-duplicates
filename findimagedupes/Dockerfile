FROM golang

RUN apt-get update \
    && apt-get install \
               --yes \
               dcraw \
               libmagic-dev \
               libjpeg-dev \
               libpng-dev \
               libtiff5-dev \
               libheif-dev \
    && rm -rf /var/lib/apt/lists/* \
    && go install gitlab.com/opennota/findimagedupes@latest

ENTRYPOINT [ "/go/bin/findimagedupes" ]
