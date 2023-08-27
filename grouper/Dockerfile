FROM ruby:3-slim AS build

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

FROM ruby:3-slim AS tuntime

WORKDIR /app

COPY --from=build /app/sqlite-phhammdist/sqlite-phhammdist.so .

COPY Gemfile* ./

RUN gem install --no-doc bundler && bundle install

COPY ./ ./

ENTRYPOINT ["./main"]
