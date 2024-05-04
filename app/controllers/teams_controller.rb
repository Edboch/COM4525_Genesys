# frozen_string_literal: true

# Controller for managing teams in the application
class TeamsController < ApplicationController
  before_action :set_team, only: %i[show edit update destroy players]

  # GET /teams
  def index
    @teams = Team.all
  end

  # GET /teams/1
  def show; end

  # GET /teams/new
  def new
    @team = Team.new
  end

  # GET /teams/1/edit
  def edit; end

  # POST /teams
  def create
    @team = Team.new(team_params)

    if @team.save
      redirect_to team_invites_path(@team.id), notice: I18n.t('team.create.success')
    else
      render :new, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /teams/1
  def update
    if @team.update(team_params)
      redirect_to @team, notice: I18n.t('team.update.success'), status: :see_other
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # DELETE /teams/1
  def destroy
    @team.destroy
    redirect_to dashboard_path, notice: I18n.t('team.destroy.success'), status: :see_other
  end

  def players
    # fetch all userteams with this team id and accepted invite
    user_teams = UserTeam.where(team_id: @team.id, accepted: true)

    # fetch all players with userteams user id
    players = []
    user_teams.each do |user_team|
      players.append(User.find_by(id: user_team.user_id))
    end

    # send all players to view
    @players = players
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_team
    @team = Team.find(params[:id])
  end

  # Only allow a list of trusted parameters through.
  def team_params
    params.require(:team).permit(:name, :location_name, :owner_id)
  end
end
