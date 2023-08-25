FROM ruby:3-slim

WORKDIR /app

COPY ./ ./

RUN gem install --no-doc bundler && bundle install

CMD ["./main"]
