# frozen_string_literal: true

# Provides helper functions for tracking metrics throughout the app
module MetricsHelper
  def get_timezone_time(time_zone, epochs)
    datetime = nil
    logger.info epochs
    Time.use_zone time_zone do
      datetime = Time.zone.at epochs / 1000
    end
    datetime
  end
end
