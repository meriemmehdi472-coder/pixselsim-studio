Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "https://pixelsim-studio-front.onrender.com",
            "http://localhost:5173",
            "http://localhost:3000"

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose: ["Authorization"],
      max_age: 600
  end
end