let BUTTON_VIEWS = {};

let POP_TOTAL;
let POP_AVGM;
let POP_AVGW;

let USER_CARDS;

let IDX_OPEN_CARD = -1;

const Q_CONTROL_BUTTON = '#control-panel > button';

/**
  * Pulls popularity data from the database and uses it
  * to fill the appropriate fields
  */
async function updatePopularity() {
  const response = await SERVER.fetch('popularity');
  const json = await response.json();

  POP_TOTAL.html(json['total']);
  POP_AVGM.html(json['avgm']);
  POP_AVGW.html(json['avgw']);
}

async function populateUsers() {
  const response = await SERVER.fetch('get-users');
  const json = await response.json();

  let userCard = $('template.user-card').contents()[1];
  let idxCard = 0;

  function addCard(user) {
    let card = $(userCard).clone();
    card.attr('id', 'user-' + user.id);

    const index = idxCard;
    card.on('click', function(evt) {
      let target = $(evt.target);
      if (IDX_OPEN_CARD == index) {
        if (!(target.is(card) || target.is(card.find('.uc-enlarge'))))
          return;

        card.removeClass('open');
        IDX_OPEN_CARD = -1;
        return;
      }

      if (IDX_OPEN_CARD > -1)
        USER_CARDS.children().eq(IDX_OPEN_CARD).removeClass('open');

      card.addClass('open');
      IDX_OPEN_CARD = index;
    });

    card.find('.email').text(user.email);
    let inpName = card.find('[name="name"]');
    inpName.val(user.name);
    let inpEmail = card.find('[name="email"]');
    inpEmail.val(user.email);

    let roleList = card.find('.role-list span');
    user.roles.forEach(function(role, idx) {
      let tickbox = card.find('input:checkbox[name="' + role + '"]');

      let text = roleList.text();
      if (idx != 0)
        text += " | ";
      roleList.text(text + role);

      if (tickbox) {
        tickbox.prop('checked', true);
      }
    });

    card.find('button.save').on('click', function() {
      let name = inpName.val();
      let email = inpEmail.val();
      SERVER.send('update-user', { 'id': user.id, 'name': name, 'email': email });
    });

    card.find('button.remove').on('click',function(){
      let name = inpName.val();
      let email = inpEmail.val();
      SERVER.send('remove-user', { 'id': user.id, 'name': name, 'email': email });
    })

    USER_CARDS.append(card);
    idxCard++;
  }

  // Players then managers then site admins
  // This will be configurable
  json.players.forEach(addCard);
  json.managers.forEach(addCard);
  json.site_admins.forEach(addCard);
}

/**
 * Wires up the functionality of the teams view
 *
 * Enabling the pills to fold in and out
 * Wiring up the search bars with a live dropdown feature, as well as
 * defining the entry generation functions
 */
function wireupTeamsView() {
  let teams = $('.teams-list');
  UTIL.wireupPillFoldout(
    teams, '.team-card', '.tc-body',
    function(jq_pill) {
     jq_pill.find('.search-dropdown').empty();
    });

  const getTeamID = function(teamCard) {
    const id = teamCard.attr('id');
    const teamID = id.split('-')[2];
    return parseInt(teamID, 10);
  };

  const mkfn_onPlayerDelete = function(teamID, playerID, playerEntry) {
    return async function() {
      let body = { team_id: teamID, player_id: playerID };
      const response = await SERVER.send('remove-player', body);
      if (!response.ok) {
        console.error("Failed to remove player");
        return;
      }

      playerEntry.remove();
    };
  }

  const tmpl_entry = $($('template.search-entry').contents()[1]);
  const tmpl_player = $($('template.tc-player').contents()[1]);

  const createManagerEntry = function(jq_searchBox, manager) {
    let entry = tmpl_entry.clone();
    entry.html(`${manager.name} ${manager.email}`);

    entry.on('click', function() {
      const teamCard = jq_searchBox.parents('.team-card');
      const teamID = getTeamID(teamCard);

      SERVER.send('update-manager', { manager_id: manager.id, team_id: teamID });
    });

    return entry;
  }

  const createPlayerEntry = function(jq_searchBox, player) {
    let teamCard = jq_searchBox.parents('.team-card');
    let players = teamCard.find('.tc-player').toArray();
    for (let p of players) {
      let id = $(p).attr('id');
      const regex = /t[0-9]+-p([0-9]+)/;
      const playerID = regex.exec(id)[1];
      if (parseInt(playerID, 10) == player.id)
        return;
    }

    let entry = tmpl_entry.clone();
    entry.addClass(`res-${player.id}`);
    entry.html(`${player.name} ${player.email}`);
    entry.on('click', async function() {
      const teamID = getTeamID(teamCard);

      let body = { player_id: player.id, team_id: teamID };
      const response = await SERVER.send('add-player', body);
      if (!response.ok) {
        console.error("Failed to add player");
        return;
      }

      let playerEntry = tmpl_player.clone();
      let idFormat = playerEntry.attr('id');
      let id = idFormat.format(teamID, player.id);
      playerEntry.attr('id', id);

      playerEntry.find('.tcp-name').text(player.name);
      playerEntry.find('button.delete')
                 .on('click',
                     mkfn_onPlayerDelete(teamID, player.id, playerEntry));

      teamCard.find('.tc-player-list').append(playerEntry);
    });

    return entry;
  };

  UTIL.createSearchBox(
    teams.find('input[name="manager-search"]'),
    (jq) => jq.siblings('.search-dropdown'),
    ALL_MANAGERS,
    ['name', 'email'],
    createManagerEntry
  );

  UTIL.createSearchBox(
    teams.find('input[name="player-search"]'),
    (jq) => jq.siblings('.search-dropdown'),
    ALL_PLAYERS,
    ['name', 'email'],
    createPlayerEntry
  );

  teams.find('.tc-player').each(function () {
    const regex = /t([0-9]+)-p([0-9]+)/;
    const id = $(this).attr('id');
    const match = regex.exec(id);

    const playerEntry = $(this);
    playerEntry.find('button.delete')
               .on('click',
                   mkfn_onPlayerDelete(match[1], match[2], playerEntry));
  });
}

async function wireUpCreateNewTeam() {
  const domNewTeam = $('#new-team');
  let domTeamName = domNewTeam.find('[name="team_name"]');
  let domLocationName = domNewTeam.find('[name="location_name"]');
  let domManagerEmail = domNewTeam.find('[name="manager_email"]');
  domNewTeam.find('#new-team-submit').on('click', function() {
    if (domTeamName.val() === '') {
      console.error('NEW TEAM No team name provided');
      return;
    }
    if (domLocationName.val() === '') {
      console.error('NEW TEAM No location name provided');
      return;
    }
    if (domManagerEmail.val() === '') {
      console.error("NEW TEAM Manager's email not provided");
      return;
    }
    SERVER.send('new-team', {
      'team_name': domTeamName.val(), 'location_name': domLocationName.val(), 'manager_email': domManagerEmail.val()
    });
  });
}

function mkfn_selectInfoView(target) {
  return function() {
    for (let [id, domView] of Object.entries(BUTTON_VIEWS)) {
      let button = $(Q_CONTROL_BUTTON + '#' + id);
      let view = $(domView);
      if (id === target) {
        button.addClass('selected');
        view.show();
      }
      else {
        button.removeClass('selected');
        view.hide();
      }
    }
  };
}

document.addEventListener('DOMContentLoaded', function() {
  POP_TOTAL = $('#gnrl-popularity .total .value');
  POP_AVGM = $('#gnrl-popularity .avgm .value');
  POP_AVGW = $('#gnrl-popularity .avgw .value');

  USER_CARDS = $('#users .card-list');

  let buttons = $(Q_CONTROL_BUTTON).toArray();
  let infoViews = $('#info-block > *').toArray();

  function mkfn_findViewByID(id) {
    return (view) => $(view).attr('id') === id;
  }

  let foundSelectedView = false;
  buttons.forEach(function(btn) {
    let jqBtn = $(btn);
    let btnID = jqBtn.attr('id');

    let view = infoViews.find(mkfn_findViewByID(jqBtn.attr('id')));
    BUTTON_VIEWS[btnID] = view;

    jqBtn.on('click', mkfn_selectInfoView(btnID));

    if (!foundSelectedView && jqBtn.hasClass('selected')) {
      foundSelectedView = true;
      $(view).show();
    }
    else {
      jqBtn.removeClass('selected');
      $(view).hide();
    }
  });

  if (!foundSelectedView) {
    let first = Object.keys(BUTTON_VIEWS)[0];
    $(Q_CONTROL_BUTTON + '#' + first).addClass('selected');
    $(BUTTON_VIEWS[first]).show();
  }

  updatePopularity();
  populateUsers();
  wireupTeamsView();
  wireUpCreateNewTeam();
});

