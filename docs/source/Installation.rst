From the Release Bundle
=======================

RecallGraph installs like any other *Foxx Microservice* inside a
database, on an ArangoDB instance.

1. Download the `latest
   release <https://github.com/adityamukho/RecallGraph/releases/>`__.
2. Follow the instructions in the `Foxx Deployment
   Manual <https://www.arangodb.com/docs/3.5/foxx-deployment.html>`__.
   The web interface is the easiest, while the ``foxx-cli`` is more
   suitable for power users.

From Source
===========

1. Install
   `ArangoDB <https://www.arangodb.com/docs/stable/getting-started-installation.html>`__
   and create a database and a user with admin privileges for that
   database.

2. Install the *Foxx CLI*:

   ``npm install --global foxx-cli``

3. Assuming the database created in step 1 above is called ``rgtest``
   and the admin user for that database is ``rguser`` having password
   ``rgpasswd``, define a server endpoint for *Foxx CLI*:

   ``foxx server set local-rgtest http://localhost:8529 -D rgtest -u rguser -P``

   Enter ``rgpasswd`` at the prompt and press *Enter* to finish the
   server definition step.

4. Clone this repository:

   ``git clone https://github.com/RecallGraph/RecallGraph.git``

5. Install module dependencies:

   ``npm install``

6. Copy ``.env.example`` to ``.env`` and set the following values:

   ::

      ARANGO_SERVER=local-rgtest
      EVSTORE_MOUNT_POINT=/recall

   The mounted service will be available at
   ``http://localhost:8529/_db/rgtest/recall`` after the installation is
   complete.

7. Install the service:

   ``npm run setup``

Now that the service has been installed, you can browse its API and
settings by logging into your ArangoDB instance's web API using the
credentials used above and selecting the ``rgtest`` database. Once
logged in, click on the *Services* tab in the left sidebar and you
should find the *RecallGraph* service listed there.
