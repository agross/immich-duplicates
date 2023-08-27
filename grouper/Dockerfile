FROM ruby:3-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install \
               --yes \
               git \
               make \
               gcc \
               libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/* \
    && git clone https://github.com/greycubesgav/sqlite-phhammdist.git \
    && cd sqlite-phhammdist \
    && make

COPY Gemfile* ./

RUN gem install --no-doc bundler && bundle install

COPY ./ ./

ENTRYPOINT ["./main"]
