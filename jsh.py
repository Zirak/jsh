import webapp2
import jinja2
from webapp2_extras import sessions

from google.appengine.ext import ndb

import json
import os

# Models and base classes #

# This name, like Britta, is the worst.
# A Jession is a Session. Only with J instead of S.
# And a session is really just an array of commands.
class Jession(ndb.Model):
    commands = ndb.TextProperty(repeated=True)

class SessionHandler(webapp2.RequestHandler):
    def dispatch(self):
        self.session_store = sessions.get_store(request=self.request)

        try:
            webapp2.RequestHandler.dispatch(self)
        finally:
            self.session_store.save_sessions(self.response)

    @webapp2.cached_property
    def session(self):
        return self.session_store.get_session()

    def generate_csrf(self):
        # TODO yes, this is crap.
        import time, os, random, hashlib

        # Why 128? Because yo mama, that's why.
        parts = map(str, [
            time.time(),
            os.urandom(128),
            self.request.remote_addr or hex(os.urandom(15))
        ])

        random.shuffle(parts)

        return hashlib.sha512(''.join(parts)).hexdigest()

# Routes #

class MainPage(SessionHandler):
    def get(self):
        count = self.session.get('counter')

        if count:
            count += 1
        else:
            self.response.write('welcome!')
            count = 1

        self.session['counter'] = count
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.write('{"counter" : "%s"}' % count)

class GetJession(SessionHandler):
    def get(self, jession_id=None):
        # import pdb; pdb.set_trace()
        commands = self.get_commands(jession_id)

        csrf = self.generate_csrf()
        self.session['csrf'] = csrf

        template = JINJA.get_template('jession.jinja')
        self.response.write(template.render({
            'commands' : self.escape_json(json.dumps(commands)),
            'csrf' : csrf
        }))

    def get_commands(self, jession_id):
        # jession_id is (supposed to be) the base36 encoding of a db id
        try:
            db_id = int(jession_id, 36)
        except (ValueError, TypeError):
            return []

        jession = Jession.get_by_id(db_id)
        return jession.commands if jession else []

    def escape_json(self, json):
        return json
        # return json.replace(

class SaveJession(SessionHandler):
    def post(self):
        # import pdb; pdb.set_trace()
        try:
            data = json.loads(self.request.body)
            assert data['commands']
            assert data['csrf']
            assert data['csrf'] == self.session['csrf']
        except (ValueError, AssertionError):
            self.response.status = 400
            return

        jession = Jession(commands=data['commands'])
        jession.put()

        self.response.headers['Content-Type'] = 'application/json'

        # TODO Should we generate another csrf token?
        import pdb; pdb.set_trace()

        self.response.write(json.dumps({
            'id' : int_to_base(jession.key.id(), 36)
        }))

# Utility crap

def int_to_base(n, base, chars=None):
    '''
    Takes an integer and converts it to a given base (2 <= base <= 36).
    The opposite of int(n, base). And batman.
    '''

    if chars is None:
        import string
        chars = string.digits + string.lowercase

    if base > len(chars):
        err = 'Base (%d) larger than amount of chars (%d)' % (base, len(chars))
        raise ValueError(err)

    if n < base:
        return chars[n]

    mod = n % base
    return int_to_base(n / base, base, chars) + chars[mod]

# Here be start of program

JINJA = jinja2.Environment(
    loader=jinja2.FileSystemLoader('templates/'),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

app_config = {
    'webapp2_extras.sessions' : {
        'secret_key' : 'butts'
    }
}

application = webapp2.WSGIApplication([
    (r'/', GetJession),
    (r'/([\da-z]+)', GetJession),
    (r'/save', SaveJession)
], debug=True, config=app_config)
