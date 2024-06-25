<?php
/**
 * Copyright since 2007 PrestaShop SA and Contributors
 * PrestaShop is an International Registered Trademark & Property of PrestaShop SA
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@prestashop.com so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade PrestaShop to newer
 * versions in the future. If you wish to customize PrestaShop for your
 * needs please refer to https://devdocs.prestashop.com/ for more information.
 *
 * @author    PrestaShop SA and Contributors <contact@prestashop.com>
 * @copyright Since 2007 PrestaShop SA and Contributors
 * @license   https://opensource.org/licenses/OSL-3.0 Open Software License (OSL 3.0)
 */

if (!in_array(PHP_SAPI, ['cli', 'cli-server', 'phpdbg'])) {
    exit;
}

$action = $argv[1] ?? 'install';

if (!in_array($action, ['install', 'uninstall'])) {
    error("Unknown action: $action");
}

$rootPath = dirname(__DIR__);
$consolePath = $rootPath.'/bin/console';

$modulesFile = $rootPath.'/modules.json';

if (!file_exists($modulesFile)) {
    error("File not found: $modulesFile", 2);
}

$modules = json_decode(file_get_contents($modulesFile));

if ('install' === $action) {
    foreach ($modules as $module) {
        echo "Installing/Upgrading module $module ...".PHP_EOL;

        executeAction($module);
    }
} else {
    exec(
        'php '.escapeshellarg($consolePath).' prestashop:list-modules',
        $output,
        $returnCode
    );

    if ($returnCode !== 0) {
        error($output, 2);
    }

    foreach ($output as $module) {
        if ('' === $module || in_array($module, $modules)) {
            continue;
        }

        echo "Uninstalling module $module ...".PHP_EOL;

        executeAction($module);
    }
}

exec(
    'php '.escapeshellarg($consolePath).' cache:clear',
    $output,
    $returnCode
);

if ($returnCode !== 0) {
    error($output, 2);
}

exit(0);

function executeAction(string $module): void
{
    global $consolePath, $action;

    exec(
        'php '.escapeshellarg($consolePath).' prestashop:install-module '.$action.' '.escapeshellarg($module),
        $output,
        $returnCode
    );

    if ($returnCode !== 0) {
        error($output, 2);
    }
}

function error($error, int $code = 1): void
{
    if (is_array($error)) {
        $error = implode(PHP_EOL, $error);
    }

    echo $error.PHP_EOL;

    exit($code);
}
