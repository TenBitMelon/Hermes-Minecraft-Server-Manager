/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  const adminEmail = $os.getenv('POCKETBASE_INTERNAL_ADMIN_EMAIL');
  const adminPassword = $os.getenv('POCKETBASE_INTERNAL_ADMIN_PASSWORD');

  console.log(`Creating admin account with email ${adminEmail}`);

  const admin = new Admin();
  admin.email = adminEmail;
  admin.setPassword(adminPassword);

  dao.saveAdmin(admin);
});
