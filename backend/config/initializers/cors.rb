Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins [
      "https://pixselforge.onrender.com", #  frontend Render
      "http://localhost:5173",                     #frontend local (Vite)
      "http://localhost:3000"                      # (Rails)
    ]

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose: ["Authorization"],
      credentials: true,
      max_age: 600
  end
end