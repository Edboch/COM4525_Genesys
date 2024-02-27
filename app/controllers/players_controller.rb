# frozen_string_literal: true

# Controller for managing the dashboard in the application
class PlayersController < ApplicationController
  def invites
    return unless current_user.player?

    # send the current players invites to the view
    @invites = UserTeam.where(user_id: current_user.id, accepted: false)
  end
end