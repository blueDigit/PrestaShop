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

namespace PrestaShopBundle\Command;

use Employee;
use PrestaShop\PrestaShop\Adapter\LegacyContext;
use PrestaShop\PrestaShop\Core\Addon\Module\ModuleManager;
use Symfony\Bundle\FrameworkBundle\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class InstallModuleCommand extends ContainerAwareCommand
{
    protected function configure(): void
    {
        $this
            ->setName('prestashop:install-module')
            ->setDescription('Installes or uninstalles a module')
            ->addArgument(
                'action',
                InputArgument::REQUIRED,
                'Action (install, uninstall)'
            )
            ->addArgument(
                'module name',
                InputArgument::REQUIRED,
                'Module on which the action will be executed'
            )
            ->setHidden(true)
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $action = $input->getArgument('action');

        if (!in_array($action, ['install', 'uninstall'])) {
            $output->writeln("Unknown action: $action");

            return 1;
        }

        $moduleName = $input->getArgument('module name');

        /** @var LegacyContext $legacyContext */
        $legacyContext = $this->getContainer()->get('prestashop.adapter.legacy.context');
        //We need to have an employee or the module hooks don't work
        //see LegacyHookSubscriber
        if (!$legacyContext->getContext()->employee) {
            //Even a non existing employee is fine
            $legacyContext->getContext()->employee = new Employee(42);
        }

        /** @var ModuleManager $moduleManager */
        $moduleManager = $this
            ->getContainer()
            ->get('prestashop.module.manager')
            ->setActionParams([
                'cacheClearEnabled' => false,
            ])
        ;

        if (!$moduleManager->{$action}($moduleName)) {
            $output->writeln(strip_tags(html_entity_decode(
                $moduleManager->getError($moduleName)
            )));
        
            return 2;
        }

        return 0;
    }
}
