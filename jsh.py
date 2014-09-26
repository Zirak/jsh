import webapp2, jinja2

from google.appengine.ext import ndb

import json
import os

# Models #

# This name, like Britta, is the worst.
# A Jession is a Session. Only with J instead of S.
# And a session is really just an array of commands.
class Jession(ndb.Model):
    commands = ndb.TextProperty(repeated=True)

# Routes #

class GetJession(webapp2.RequestHandler):
    def get(self, jession_id=None):
        if jession_id is not None:
            commands = self.get_commands(jession_id)
        else:
            commands = []

        # TODO actually select between min and full based on some environment
        #variable - for some reason GAE is being weird about them.
        template_path = 'jession.min.jinja'
        template = JINJA.get_template(template_path)

        self.response.write(template.render({
            'commands' : json.dumps(commands)
        }))

    def get_commands(self, jession_id):
        # jession_id is (supposed to be) the base36 encoding of a db id
        try:
            db_id = int(jession_id, 36)
        except (ValueError, TypeError):
            return []

        jession = Jession.get_by_id(db_id)
        return jession.commands if jession else []

class SaveJession(webapp2.RequestHandler):
    def post(self):
        try:
            data = json.loads(self.request.body)
            assert data['commands'], 'request has no commands'
        except (ValueError, AssertionError) as e:
            print e
            import traceback; traceback.format_exc()

            self.response.status = 400
            return

        jession = Jession(commands=data['commands'])
        jession.put()

        self.response.headers['Content-Type'] = 'application/json'

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

application = webapp2.WSGIApplication([
    (r'/', GetJession),
    (r'/save', SaveJession),
    # Always keep this last, as it's a catch-all
    (r'/([\da-z]+)', GetJession)
], debug=True)
